from __future__ import annotations

from typing import Any

import chromadb
from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction, SentenceTransformerEmbeddingFunction

from backend.app.core.config import get_settings
from backend.app.documents.chunking import DocumentChunk
from backend.app.models.schemas import Source
from backend.app.rag.quote_utils import trim_quote


class VectorStore:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = chromadb.PersistentClient(path=str(self.settings.chroma_dir))
        self.embedding_function = create_embedding_function()
        self.collection = self.client.get_or_create_collection(
            name=self.settings.collection_name,
            embedding_function=self.embedding_function,
            metadata={"hnsw:space": "cosine"},
        )

    def upsert_chunks(self, chunks: list[DocumentChunk], batch_size: int = 64) -> None:
        for start in range(0, len(chunks), batch_size):
            batch = chunks[start : start + batch_size]
            self.collection.upsert(
                ids=[chunk.id for chunk in batch],
                documents=[chunk.text for chunk in batch],
                metadatas=[chunk.metadata() for chunk in batch],
            )

    def delete_source(self, source_path: str) -> None:
        self.collection.delete(where={"source_path": source_path})

    def query(self, text: str, top_k: int | None = None, where: dict[str, Any] | None = None) -> list[Source]:
        top_k = top_k or self.settings.retrieval_top_k
        query_kwargs: dict[str, Any] = {
            "query_texts": [text],
            "n_results": top_k,
            "include": ["documents", "metadatas", "distances"],
        }
        if where is not None:
            query_kwargs["where"] = where

        results = self.collection.query(**query_kwargs)
        return sources_from_results(results)

    def count(self) -> int:
        return self.collection.count()


def create_embedding_function():
    settings = get_settings()
    provider = settings.embeddings_provider.lower()

    if provider == "local":
        return SentenceTransformerEmbeddingFunction(model_name=settings.local_embedding_model)

    if provider == "openai":
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is required when EMBEDDINGS_PROVIDER=openai.")
        return OpenAIEmbeddingFunction(
            api_key=settings.openai_api_key,
            model_name=settings.openai_embedding_model,
        )

    raise RuntimeError(f"Unsupported EMBEDDINGS_PROVIDER: {settings.embeddings_provider}")


def sources_from_results(results: dict[str, Any]) -> list[Source]:
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    sources: list[Source] = []

    for text, metadata, distance in zip(documents, metadatas, distances):
        score = 1 - float(distance) if distance is not None else None
        sources.append(
            Source(
                document=metadata.get("document", ""),
                section=metadata.get("section") or metadata.get("heading") or metadata.get("subsection"),
                page=metadata.get("page"),
                quote=trim_quote(text),
                source_path=metadata.get("source_path", ""),
                source_url=metadata.get("source_url"),
                type=metadata.get("type", ""),
                level=metadata.get("level"),
                subject=metadata.get("subject"),
                score=score,
            )
        )
    return sources


