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

    async def chat(self, message: str, top_k: int | None = None) -> ChatResponse:
        sources = self.vector_store.query(message, top_k=top_k)
        relevant_sources = [source for source in sources if source.score is None or source.score >= 0.15]
        if not relevant_sources:
            return ChatResponse(answer=REFUSAL_MESSAGE, sources=[], refusal=True)

        completion = await self.client.chat.completions.create(
            model=self.settings.active_chat_model,
            temperature=0,
            messages=[
                {"role": "system", "content": CHAT_SYSTEM_PROMPT},
                {"role": "user", "content": build_chat_prompt(message, relevant_sources)},
            ],
        )
        answer = completion.choices[0].message.content or REFUSAL_MESSAGE
        refusal = REFUSAL_MESSAGE in answer
        return ChatResponse(answer=answer, sources=[] if refusal else relevant_sources, refusal=refusal)


def build_chat_prompt(message: str, sources: list[Source]) -> str:
    context = "\n\n".join(
        f"[{index}] Документ: {source.document}\n"
        f"Тип: {source.type}; Уровень: {source.level or '-'}; Предмет: {source.subject or '-'}\n"
        f"Раздел: {source.section or '-'}; Страница: {source.page or '-'}\n"
        f"Путь: {source.source_path}\n"
        f"Цитата: {source.quote}"
        for index, source in enumerate(sources, start=1)
    )
    return f"Вопрос пользователя:\n{message}\n\nНайденные источники:\n{context}"
