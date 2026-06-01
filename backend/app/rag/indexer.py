from __future__ import annotations

import json
from pathlib import Path

from backend.app.core.config import get_settings
from backend.app.documents.chunking import DocumentChunk
from backend.app.documents.pipeline import build_chunks, parse_all_documents
from backend.app.rag.vector_store import VectorStore


class DocumentIndexer:
    def __init__(self, vector_store: VectorStore | None = None) -> None:
        self.settings = get_settings()
        self.vector_store = vector_store or VectorStore()
        self.state_path = self.settings.metadata_dir / "indexed_files.json"

    def index_all(self, incremental: bool = True) -> dict[str, int]:
        parsed = parse_all_documents()
        chunks = build_chunks(parsed)
        old_state = self.read_state()
        new_state = {item["source_path"]: item["file_hash"] for item in parsed}

        if incremental:
            changed_sources = [
                source_path
                for source_path, file_hash in new_state.items()
                if old_state.get(source_path) != file_hash
            ]
            removed_sources = [source_path for source_path in old_state if source_path not in new_state]
        else:
            changed_sources = list(new_state)
            removed_sources = list(old_state)

        for source_path in removed_sources + changed_sources:
            self.vector_store.delete_source(source_path)

        chunks_to_index = [chunk for chunk in chunks if chunk.source_path in set(changed_sources)]
        self.vector_store.upsert_chunks(chunks_to_index)
        self.write_state(new_state)

        return {
            "documents": len(parsed),
            "chunks_total": len(chunks),
            "chunks_indexed": len(chunks_to_index),
            "changed_documents": len(changed_sources),
            "removed_documents": len(removed_sources),
        }

    def read_state(self) -> dict[str, str]:
        if not self.state_path.exists():
            return {}
        return json.loads(self.state_path.read_text(encoding="utf-8"))

    def write_state(self, state: dict[str, str]) -> None:
        self.state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
