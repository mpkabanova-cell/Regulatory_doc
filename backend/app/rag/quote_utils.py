from __future__ import annotations

import re


def trim_quote(text: str, max_chars: int = 700) -> str:
    text = normalize_quote_start(" ".join(text.split()))
    if len(text) <= max_chars:
        return text

    trimmed = text[:max_chars].rsplit(" ", 1)[0]
    sentence_end = max(trimmed.rfind(". "), trimmed.rfind("! "), trimmed.rfind("? "))
    if sentence_end >= max_chars * 0.45:
        trimmed = trimmed[: sentence_end + 1]
    return trimmed + "..."


def normalize_quote_start(text: str) -> str:
    text = text.strip(" .,…;:-")
    if not text:
        return text

    # Prefer a complete numbered regulatory point over an overlap fragment.
    numbered_point = re.search(r"(?<!\d)(\d+(?:\.\d+)+\.?\s+[А-ЯЁA-Z])", text)
    if numbered_point and numbered_point.start() <= 300:
        return text[numbered_point.start() :].strip()

    if starts_like_complete_sentence(text):
        return text

    sentence_start = re.search(r"[.!?]\s+([А-ЯЁA-Z][^.!?]+)", text)
    if sentence_start and sentence_start.start(1) <= 300:
        return text[sentence_start.start(1) :].strip()

    return text


def starts_like_complete_sentence(text: str) -> bool:
    return bool(re.match(r"(?:\d+(?:\.\d+)+\.?\s+|[А-ЯЁA-Z])", text))
