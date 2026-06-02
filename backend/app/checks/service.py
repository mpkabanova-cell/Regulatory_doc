from __future__ import annotations

import json
from pathlib import Path

from backend.app.core.config import get_settings
from backend.app.documents.extract import extract_document_text
from backend.app.models.schemas import CheckResponse, ComplianceRow, Source
from backend.app.rag.llm_client import create_llm_client
from backend.app.rag.prompts import CHECK_SYSTEM_PROMPT
from backend.app.rag.store_factory import RetrievalStore, create_retrieval_store


class CheckService:
    def __init__(self, vector_store: RetrievalStore | None = None) -> None:
        self.settings = get_settings()
        self.vector_store = vector_store or create_retrieval_store()
        self.client = create_llm_client(self.settings)

    async def check_document(self, upload_path: Path, document_type: str) -> CheckResponse:
        user_text = "\n".join(page.text for page in extract_document_text(upload_path))
        query = f"Нормативные требования для проверки материала типа: {document_type}\n{user_text[:3000]}"
        sources = self.vector_store.query(query, top_k=10)
        if not sources:
            return CheckResponse(rows=[], summary="Нормативные основания для проверки не найдены.", sources=[])

        completion = await self.client.chat.completions.create(
            model=self.settings.active_chat_model,
            temperature=0,
            messages=[
                {"role": "system", "content": CHECK_SYSTEM_PROMPT},
                {"role": "user", "content": build_check_prompt(document_type, user_text, sources)},
            ],
        )
        rows = parse_rows(completion.choices[0].message.content or "[]", sources)
        return CheckResponse(rows=rows, summary=build_summary(rows), sources=sources)


def build_check_prompt(document_type: str, user_text: str, sources: list[Source]) -> str:
    context = "\n\n".join(
        f"[{index}] {source.document}, стр. {source.page or '-'}, {source.section or '-'}\n{source.quote}"
        for index, source in enumerate(sources, start=1)
    )
    return (
        f"Тип материала: {document_type}\n\n"
        f"Текст пользовательского документа:\n{user_text[:9000]}\n\n"
        f"Нормативные источники:\n{context}"
    )


def parse_rows(raw: str, sources: list[Source]) -> list[ComplianceRow]:
    try:
        data = json.loads(raw.strip().removeprefix("```json").removesuffix("```").strip())
    except json.JSONDecodeError:
        return [
            ComplianceRow(
                requirement="Проверка соответствия",
                status="требуется уточнение",
                comment=raw.strip() or "Не удалось разобрать структурированный ответ модели.",
                source=sources[0] if sources else None,
            )
        ]

    rows: list[ComplianceRow] = []
    for item in data if isinstance(data, list) else []:
        source_index = int(item.get("source_index", 1) or 1) - 1
        rows.append(
            ComplianceRow(
                requirement=str(item.get("requirement", "")).strip(),
                status=str(item.get("status", "требуется уточнение")).strip(),
                comment=str(item.get("comment", "")).strip(),
                source=sources[source_index] if 0 <= source_index < len(sources) else None,
            )
        )
    return rows


def build_summary(rows: list[ComplianceRow]) -> str:
    violations = sum(1 for row in rows if row.status.lower() == "нарушение")
    uncertain = sum(1 for row in rows if row.status.lower() == "требуется уточнение")
    if violations:
        return f"Найдено нарушений: {violations}. Требуют уточнения: {uncertain}."
    return f"Явных нарушений не найдено. Требуют уточнения: {uncertain}."
