from __future__ import annotations

from backend.app.core.config import get_settings
from backend.app.models.schemas import ChatHistoryMessage, ChatResponse, Source
from backend.app.rag.llm_client import create_llm_client
from backend.app.rag.prompts import CHAT_SYSTEM_PROMPT, METHODIST_SYSTEM_PROMPT, REFUSAL_MESSAGE
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
        history: list[ChatHistoryMessage] | None = None,
    ) -> ChatResponse:
        history = history or []
        retrieval_message = resolve_retrieval_message(message, history)
        document_type = document_type or infer_document_type(message) or infer_document_type(retrieval_message)
        subject = infer_subject(message) or infer_subject(retrieval_message) or subject
        level = infer_level(message) or infer_level(retrieval_message) or level
        clarification = build_clarification_question(retrieval_message, subject=subject, level=level)
        if clarification:
            return ChatResponse(answer=clarification, sources=[], refusal=False)

        relevant_sources = self.query_with_fallbacks(
            retrieval_message,
            top_k=top_k,
            document_type=document_type,
            level=level,
            subject=subject,
        )
        if not relevant_sources:
            answer = await self.methodist_reply(
                message=message,
                retrieval_message=retrieval_message,
                history=history,
                document_type=document_type,
                level=level,
                subject=subject,
                reason="В нормативной базе не найдено достаточно близких источников по текущему запросу.",
            )
            return ChatResponse(answer=answer, sources=[], refusal=False)

        completion = await self.client.chat.completions.create(
            model=self.settings.active_chat_model,
            temperature=0,
            messages=[
                {"role": "system", "content": CHAT_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": build_chat_prompt(
                        retrieval_message,
                        relevant_sources,
                        current_message=message,
                        history=history,
                        document_type=document_type,
                        level=level,
                        subject=subject,
                    ),
                },
            ],
        )
        answer = completion.choices[0].message.content or REFUSAL_MESSAGE
        refusal = REFUSAL_MESSAGE in answer
        if refusal:
            answer = await self.methodist_reply(
                message=message,
                retrieval_message=retrieval_message,
                history=history,
                document_type=document_type,
                level=level,
                subject=subject,
                reason="Подобраны ближайшие материалы из базы, но они требуют осторожного резюме без категоричных формулировок.",
            )
            return ChatResponse(answer=answer, sources=relevant_sources, refusal=False)

        return ChatResponse(answer=answer, sources=relevant_sources, refusal=False)

    async def methodist_reply(
        self,
        message: str,
        retrieval_message: str,
        history: list[ChatHistoryMessage],
        document_type: str | None = None,
        level: str | None = None,
        subject: str | None = None,
        reason: str = "",
    ) -> str:
        completion = await self.client.chat.completions.create(
            model=self.settings.active_chat_model,
            temperature=0.2,
            messages=[
                {"role": "system", "content": METHODIST_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": build_methodist_prompt(
                        message=message,
                        retrieval_message=retrieval_message,
                        history=history,
                        document_type=document_type,
                        level=level,
                        subject=subject,
                        reason=reason,
                    ),
                },
            ],
        )
        return completion.choices[0].message.content or (
            "Подобрал наиболее близкие материалы из базы. Могу помочь сделать по ним краткое резюме или чек-лист."
        )

    def query_with_fallbacks(
        self,
        message: str,
        top_k: int | None = None,
        document_type: str | None = None,
        level: str | None = None,
        subject: str | None = None,
    ) -> list[Source]:
        candidates: list[dict[str, object] | None] = []

        candidate_filters = [
            build_metadata_filters(document_type=document_type, level=level, subject=subject),
            build_metadata_filters(document_type=document_type, level=level),
            build_metadata_filters(document_type=document_type, subject=subject),
        ]
        if subject and document_type != "frp":
            candidate_filters.extend(
                [
                    build_metadata_filters(document_type="frp", level=level, subject=subject),
                    build_metadata_filters(document_type="frp", subject=subject),
                ]
            )
        candidate_filters.extend([build_metadata_filters(document_type=document_type), None])

        for candidate in candidate_filters:
            if candidate not in candidates:
                candidates.append(candidate)

        merged_sources: list[Source] = []
        for filters in candidates:
            sources = self.vector_store.query(message, top_k=top_k, where=filters)
            if sources:
                merged_sources.extend(sources)

        return rank_and_dedupe_sources(merged_sources, subject=subject, level=level)[: top_k or self.settings.retrieval_top_k]


def build_metadata_filters(
    document_type: str | None = None,
    level: str | None = None,
    subject: str | None = None,
) -> dict[str, object] | None:
    clauses: list[dict[str, str]] = []
    if document_type:
        clauses.append({"type": document_type})

    # Level and subject metadata are reliably present for FRP chunks only.
    # If document_type is not selected ("Все документы"), search the whole base
    # and pass level/subject as prompt context instead of narrowing ChromaDB.
    can_filter_by_program_context = document_type == "frp"
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


SUBJECT_ALIASES = {
    "Информатика": ("информатик", "информационн"),
    "Математика": ("математик", "алгебр", "геометри"),
    "Русский язык": ("русск",),
    "Литература": ("литератур",),
    "История": ("истори",),
    "Обществознание": ("обществознан",),
    "География": ("географ",),
    "Биология": ("биолог",),
    "Физика": ("физик",),
    "Химия": ("хими",),
    "Английский язык": ("английск",),
    "Немецкий язык": ("немецк",),
    "Французский язык": ("французск",),
    "Испанский язык": ("испанск",),
    "Китайский язык": ("китайск",),
    "Музыка": ("музык",),
    "ИЗО": ("изо", "изобразительн"),
    "Физическая культура": ("физическ", "физкультур"),
    "Труд технология": ("труд", "технолог"),
    "Окружающий мир": ("окружающ",),
    "Литературное чтение": ("литературн", "чтени"),
    "ОРКСЭ": ("орксэ",),
    "ОБЗР": ("обзр",),
}


def infer_subject(message: str) -> str | None:
    lowered = message.lower()
    for subject, aliases in SUBJECT_ALIASES.items():
        if any(alias in lowered for alias in aliases):
            return subject
    return None


def infer_level(message: str) -> str | None:
    lowered = message.lower()
    if "ноо" in lowered or "начальн" in lowered:
        return "noo"
    if "ооо" in lowered or "основн" in lowered:
        return "ooo"
    if "соо" in lowered or "средн" in lowered:
        return "soo"

    for grade in range(1, 12):
        if f"{grade} класс" in lowered or f"{grade}-" in lowered or f"{grade} " in lowered:
            if grade <= 4:
                return "noo"
            if grade <= 9:
                return "ooo"
            return "soo"
    return None


def build_clarification_question(
    message: str,
    subject: str | None = None,
    level: str | None = None,
) -> str | None:
    if not needs_precise_subject_context(message):
        return None

    missing_parts: list[str] = []
    if not subject:
        missing_parts.append("предмет")
    if not level:
        missing_parts.append("класс или уровень образования")

    if not missing_parts:
        return None

    missing = " и ".join(missing_parts)
    return (
        f"Уточните, пожалуйста, {missing}. "
        "Например: «предметные результаты по информатике в 5 классе»."
    )


def needs_precise_subject_context(message: str) -> bool:
    lowered = message.lower()
    context_markers = (
        "предметн",
        "планируем",
        "личностн",
        "метапредметн",
        "результат",
        "содержание",
        "тематическ",
        "ктп",
        "рабоч",
        "программ",
    )
    return any(marker in lowered for marker in context_markers)


def rank_and_dedupe_sources(
    sources: list[Source],
    subject: str | None = None,
    level: str | None = None,
) -> list[Source]:
    seen: set[tuple[str, int | None, str]] = set()
    unique_sources: list[Source] = []
    for source in sources:
        key = (source.source_path, source.page, source.quote)
        if key in seen:
            continue
        seen.add(key)
        unique_sources.append(source)

    def rank(source: Source) -> tuple[int, int, float]:
        subject_match = int(bool(subject and source.subject == subject))
        level_match = int(bool(level and source.level == level))
        score = source.score if source.score is not None else 0
        return (subject_match, level_match, score)

    return sorted(unique_sources, key=rank, reverse=True)


def resolve_retrieval_message(message: str, history: list[ChatHistoryMessage]) -> str:
    if not is_dialogue_continuation(message):
        return message

    previous_question = find_previous_user_query(history)
    return previous_question or message


def find_previous_user_query(history: list[ChatHistoryMessage]) -> str | None:
    for item in reversed(history):
        if item.role != "user":
            continue
        content = item.content.strip()
        if content and not is_dialogue_continuation(content):
            return content
    return None


def is_dialogue_continuation(message: str) -> bool:
    text = " ".join(message.lower().strip().split())
    if not text:
        return False
    if "?" in text:
        return False

    continuation_markers = (
        "уточнил",
        "уточнила",
        "выбрал",
        "выбрала",
        "поставил",
        "поставила",
        "готово",
        "ок",
        "да",
        "нет",
        "ищи везде",
        "искать везде",
        "теперь",
        "продолжи",
        "продолжай",
    )
    if any(marker in text for marker in continuation_markers):
        return True

    words = text.split()
    return len(words) <= 3 and not infer_document_type(text)


def build_chat_prompt(
    message: str,
    sources: list[Source],
    current_message: str | None = None,
    history: list[ChatHistoryMessage] | None = None,
    document_type: str | None = None,
    level: str | None = None,
    subject: str | None = None,
) -> str:
    active_filters = "; ".join(
        value
        for value in (
            f"тип документа: {document_type}" if document_type else None,
            f"уровень: {format_level(level)}" if level else None,
            f"предмет: {subject}" if subject else None,
        )
        if value
    )
    context = "\n\n".join(
        f"[{index}] Документ: {source.document}\n"
        f"Тип: {source.type}; Уровень: {format_level(source.level) if source.level else '-'}; Предмет: {source.subject or '-'}\n"
        f"Раздел: {source.section or '-'}; Страница: {source.page or '-'}\n"
        f"Путь: {source.source_path}\n"
        f"Цитата: {source.quote}"
        for index, source in enumerate(sources, start=1)
    )
    return (
        f"Поисковый запрос по нормативной базе:\n{message}\n\n"
        f"Текущая реплика пользователя:\n{current_message or message}\n\n"
        f"Предыдущий диалог:\n{format_history(history or [])}\n\n"
        f"Активные фильтры:\n{active_filters or 'не заданы'}\n\n"
        f"Найденные источники:\n{context}"
    )


def build_methodist_prompt(
    message: str,
    retrieval_message: str,
    history: list[ChatHistoryMessage],
    document_type: str | None = None,
    level: str | None = None,
    subject: str | None = None,
    reason: str = "",
) -> str:
    active_filters = "; ".join(
        value
        for value in (
            f"тип документа: {document_type}" if document_type else None,
            f"уровень: {format_level(level)}" if level else None,
            f"предмет: {subject}" if subject else None,
        )
        if value
    )
    return (
        f"Текущая реплика пользователя:\n{message}\n\n"
        f"Содержательный запрос для поиска:\n{retrieval_message}\n\n"
        f"Режим ответа:\n{reason or 'подобраны ближайшие материалы из базы'}\n\n"
        f"Активные фильтры:\n{active_filters or 'не заданы'}\n\n"
        f"Предыдущий диалог:\n{format_history(history)}\n\n"
        "Ответь как методист с доступом к нормативной базе. "
        "Если хватает данных, дай готовый структурированный результат по формату задачи. "
        "Если данных не хватает, задай до 5 конкретных уточняющих вопросов. "
        "Не пиши фразу \"точной нормативной ссылки нет\". "
        "Если материалы подобраны частично, начни с фразы \"Подобрал наиболее близкие материалы из базы\", "
        "сначала дай их краткое резюме, затем предложи практичный следующий шаг, чек-лист или уточняющий вопрос. "
        "В конце вежливо спроси, подходит ли результат или нужны изменения."
    )


def format_history(history: list[ChatHistoryMessage], limit: int = 6) -> str:
    if not history:
        return "нет"
    items = history[-limit:]
    return "\n".join(f"{item.role}: {item.content}" for item in items)


def format_level(level: str | None) -> str:
    labels = {
        "noo": "НОО",
        "ooo": "ООО",
        "soo": "СОО",
    }
    return labels.get(level or "", level or "")
