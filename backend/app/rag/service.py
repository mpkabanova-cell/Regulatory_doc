from __future__ import annotations

from backend.app.core.config import get_settings
from backend.app.models.schemas import ChatResponse, Source
from backend.app.rag.llm_client import create_llm_client
from backend.app.rag.prompts import CHAT_SYSTEM_PROMPT, REFUSAL_MESSAGE
from backend.app.rag.vector_store import VectorStore


class RagService:
    def __init__(self, vector_store: VectorStore | None = None) -> None:
        self.settings = get_settings()
        self.vector_store = vector_store or VectorStore()
        self.client = create_llm_client(self.settings)

    async def chat(
        self,
        message: str,
        top_k: int | None = None,
        document_type: str | None = None,
        level: str | None = None,
        subject: str | None = None,
    ) -> ChatResponse:
        document_type = document_type or infer_document_type(message)
        filters = build_metadata_filters(document_type=document_type, level=level, subject=subject)
        if filters is None:
            return ChatResponse(
                answer=(
                    "Уточните, пожалуйста, контекст запроса: выберите тип документа, уровень образования "
                    "и предмет в фильтрах."
                ),
                sources=[],
                refusal=False,
            )

        relevant_sources = self.query_with_fallbacks(
            message,
            top_k=top_k,
            document_type=document_type,
            level=level,
            subject=subject,
        )
        if not relevant_sources:
            return ChatResponse(
                answer=(
                    "По выбранным фильтрам не удалось найти достаточно близкие источники. "
                    "Попробуйте выбрать тип документа или переформулировать вопрос: например, "
                    "укажите конкретный документ, уровень и предмет."
                ),
                sources=[],
                refusal=True,
            )

        completion = await self.client.chat.completions.create(
            model=self.settings.active_chat_model,
            temperature=0,
            messages=[
                {"role": "system", "content": CHAT_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": build_chat_prompt(
                        message,
                        relevant_sources,
                        document_type=document_type,
                        level=level,
                        subject=subject,
                    ),
                },
            ],
        )
        answer = completion.choices[0].message.content or REFUSAL_MESSAGE
        refusal = REFUSAL_MESSAGE in answer
        return ChatResponse(answer=answer, sources=[] if refusal else relevant_sources, refusal=refusal)

    def query_with_fallbacks(
        self,
        message: str,
        top_k: int | None = None,
        document_type: str | None = None,
        level: str | None = None,
        subject: str | None = None,
    ) -> list[Source]:
        candidates: list[dict[str, object] | None] = []

        for candidate in (
            build_metadata_filters(document_type=document_type, level=level, subject=subject),
            build_metadata_filters(document_type=document_type, level=level),
            build_metadata_filters(document_type=document_type, subject=subject),
            build_metadata_filters(document_type=document_type),
            None,
        ):
            if candidate not in candidates:
                candidates.append(candidate)

        for filters in candidates:
            sources = self.vector_store.query(message, top_k=top_k, where=filters)
            relevant_sources = [source for source in sources if source.score is None or source.score >= 0.05]
            if relevant_sources:
                return relevant_sources

        return []


def build_metadata_filters(
    document_type: str | None = None,
    level: str | None = None,
    subject: str | None = None,
) -> dict[str, object] | None:
    clauses: list[dict[str, str]] = []
    if document_type:
        clauses.append({"type": document_type})

    # Level and subject metadata are reliably present for FRP chunks. Normative
    # document packs like FGOS/SanPiN are broader documents, so use their type as
    # the vector filter and pass the remaining context to the LLM prompt.
    can_filter_by_program_context = document_type in {None, "frp"}
    if level and can_filter_by_program_context:
        clauses.append({"level": level})
    if subject and can_filter_by_program_context:
        clauses.append({"subject": subject})

    if not clauses:
        return None
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


def infer_document_type(message: str) -> str | None:
    lowered = message.lower()
    if "фгос" in lowered:
        return "fgos"
    if "фрп" in lowered or "федеральн" in lowered and "рабоч" in lowered and "программ" in lowered:
        return "frp"
    if "санпин" in lowered or "санпин" in lowered.replace(" ", ""):
        return "sanpin"
    if "профстандарт" in lowered or "профессиональн" in lowered and "стандарт" in lowered:
        return "profstandart"
    return None


def build_chat_prompt(
    message: str,
    sources: list[Source],
    document_type: str | None = None,
    level: str | None = None,
    subject: str | None = None,
) -> str:
    active_filters = "; ".join(
        value
        for value in (
            f"тип документа: {document_type}" if document_type else None,
            f"уровень: {level}" if level else None,
            f"предмет: {subject}" if subject else None,
        )
        if value
    )
    context = "\n\n".join(
        f"[{index}] Документ: {source.document}\n"
        f"Тип: {source.type}; Уровень: {source.level or '-'}; Предмет: {source.subject or '-'}\n"
        f"Раздел: {source.section or '-'}; Страница: {source.page or '-'}\n"
        f"Путь: {source.source_path}\n"
        f"Цитата: {source.quote}"
        for index, source in enumerate(sources, start=1)
    )
    return (
        f"Вопрос пользователя:\n{message}\n\n"
        f"Активные фильтры:\n{active_filters or 'не заданы'}\n\n"
        f"Найденные источники:\n{context}"
    )
