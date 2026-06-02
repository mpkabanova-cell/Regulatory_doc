from __future__ import annotations

import re
from collections import Counter
from typing import Any

from backend.app.core.config import PROJECT_ROOT, get_settings
from backend.app.documents.chunking import DocumentChunk
from backend.app.documents.pipeline import read_jsonl
from backend.app.models.schemas import Source
from backend.app.rag.quote_utils import trim_quote


class KeywordStore:
    """Low-memory retrieval store for small hosts.

    It uses prepared `metadata/chunks.jsonl` and avoids loading sentence-transformers
    or Chroma embedding functions at runtime.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.chunks_path = self.settings.metadata_dir / "chunks.jsonl"
        self._chunks: list[dict[str, Any]] | None = None

    def upsert_chunks(self, chunks: list[DocumentChunk], batch_size: int = 64) -> None:
        return None

    def delete_source(self, source_path: str) -> None:
        return None

    def count(self) -> int:
        return len(self._load_chunks())

    def query(self, text: str, top_k: int | None = None, where: dict[str, Any] | None = None) -> list[Source]:
        top_k = top_k or self.settings.retrieval_top_k
        query_tokens = tokenize(text)
        if not query_tokens:
            return []

        scored: list[tuple[float, dict[str, Any]]] = []
        query_counts = Counter(query_tokens)
        for chunk in self._load_chunks():
            if where and not matches_where(chunk, where):
                continue

            chunk_text = str(chunk.get("text", ""))
            chunk_tokens = tokenize(chunk_text)
            if not chunk_tokens:
                continue

            chunk_counts = Counter(chunk_tokens)
            lexical_score = sum(min(count, chunk_counts[token]) for token, count in query_counts.items())
            phrase_bonus = phrase_match_bonus(text, chunk_text)
            metadata_bonus = metadata_match_bonus(query_tokens, chunk)
            score = lexical_score + phrase_bonus + metadata_bonus
            if score > 0:
                scored.append((float(score), chunk))

        scored.sort(key=lambda item: item[0], reverse=True)
        return [source_from_chunk(chunk, score=score) for score, chunk in scored[:top_k]]

    def _load_chunks(self) -> list[dict[str, Any]]:
        if self._chunks is None:
            chunks_path = self.chunks_path
            fallback_path = PROJECT_ROOT / "metadata" / "chunks.jsonl"
            if not chunks_path.exists() and fallback_path.exists():
                chunks_path = fallback_path
            self._chunks = read_jsonl(chunks_path)
        return self._chunks


def tokenize(text: str) -> list[str]:
    tokens = re.findall(r"[а-яёa-z0-9]+", text.lower())
    return [token for token in tokens if len(token) >= 3 and token not in STOP_WORDS]


def phrase_match_bonus(query: str, text: str) -> int:
    lowered_text = text.lower()
    bonus = 0
    for phrase in re.findall(r"[а-яёa-z0-9]+(?:\s+[а-яёa-z0-9]+){1,3}", query.lower()):
        if len(phrase) >= 8 and phrase in lowered_text:
            bonus += 3
    return bonus


def metadata_match_bonus(query_tokens: list[str], chunk: dict[str, Any]) -> int:
    haystack = " ".join(
        str(chunk.get(key, ""))
        for key in ("document", "section", "heading", "subsection", "subject", "level", "type")
    ).lower()
    return sum(2 for token in set(query_tokens) if token in haystack)


def matches_where(chunk: dict[str, Any], where: dict[str, Any]) -> bool:
    if "$and" in where:
        clauses = where.get("$and")
        return isinstance(clauses, list) and all(matches_where(chunk, clause) for clause in clauses)
    return all(chunk.get(key) == value for key, value in where.items())


def source_from_chunk(chunk: dict[str, Any], score: float) -> Source:
    return Source(
        document=str(chunk.get("document", "")),
        section=chunk.get("section") or chunk.get("heading") or chunk.get("subsection"),
        page=chunk.get("page"),
        quote=trim_quote(str(chunk.get("text", ""))),
        source_path=str(chunk.get("source_path", "")),
        source_url=chunk.get("source_url"),
        type=str(chunk.get("type", "")),
        level=chunk.get("level"),
        subject=chunk.get("subject"),
        score=score,
    )


STOP_WORDS = {
    "для",
    "или",
    "это",
    "как",
    "что",
    "при",
    "над",
    "под",
    "без",
    "про",
    "все",
    "всех",
    "класс",
    "классе",
    "какие",
    "какой",
    "какая",
    "нужно",
    "можно",
    "должен",
    "должна",
    "должны",
}
