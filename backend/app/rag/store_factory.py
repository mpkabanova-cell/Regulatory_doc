from __future__ import annotations

import logging
from typing import Protocol

from backend.app.core.config import get_settings
from backend.app.documents.chunking import DocumentChunk
from backend.app.models.schemas import Source
from backend.app.rag.keyword_store import KeywordStore


logger = logging.getLogger(__name__)


class RetrievalStore(Protocol):
    def upsert_chunks(self, chunks: list[DocumentChunk], batch_size: int = 64) -> None: ...

    def delete_source(self, source_path: str) -> None: ...

    def query(self, text: str, top_k: int | None = None, where: dict | None = None) -> list[Source]: ...

    def count(self) -> int: ...


def create_retrieval_store() -> RetrievalStore:
    settings = get_settings()
    provider = settings.embeddings_provider.lower()
    if provider == "keyword":
        return KeywordStore()

    from backend.app.rag.vector_store import VectorStore

    try:
        return VectorStore()
    except ValueError as exc:
        if provider == "local" and "sentence_transformers" in str(exc):
            logger.warning(
                "sentence-transformers is not installed; falling back to keyword retrieval. "
                "Set EMBEDDINGS_PROVIDER=keyword on low-memory deployments."
            )
            return KeywordStore()
        raise
