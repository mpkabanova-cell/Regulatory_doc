from __future__ import annotations

from typing import Protocol

from backend.app.core.config import get_settings
from backend.app.documents.chunking import DocumentChunk
from backend.app.models.schemas import Source
from backend.app.rag.keyword_store import KeywordStore


class RetrievalStore(Protocol):
    def upsert_chunks(self, chunks: list[DocumentChunk], batch_size: int = 64) -> None: ...

    def delete_source(self, source_path: str) -> None: ...

    def query(self, text: str, top_k: int | None = None, where: dict | None = None) -> list[Source]: ...

    def count(self) -> int: ...


def create_retrieval_store() -> RetrievalStore:
    settings = get_settings()
    if settings.embeddings_provider.lower() == "keyword":
        return KeywordStore()

    from backend.app.rag.vector_store import VectorStore

    return VectorStore()
