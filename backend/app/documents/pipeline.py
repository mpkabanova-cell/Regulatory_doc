from __future__ import annotations

import json
from pathlib import Path

from backend.app.core.config import get_settings
from backend.app.documents.chunking import DocumentChunk, chunk_pages, file_sha256
from backend.app.documents.extract import PageText, extract_document_text
from backend.app.documents.metadata import discover_document_paths, infer_document_metadata, load_manifest


def parse_all_documents() -> list[dict]:
    settings = get_settings()
    manifest = load_manifest()
    parsed: list[dict] = []

    for path in discover_document_paths():
        metadata = infer_document_metadata(path, manifest)
        file_hash = file_sha256(path)
        pages = extract_document_text(path)
        parsed.append(
            {
                "source_path": metadata.source_path,
                "file_hash": file_hash,
                "metadata": metadata.to_dict(),
                "pages": [page.__dict__ for page in pages],
            }
        )

    write_jsonl(settings.metadata_dir / "documents.jsonl", parsed)
    return parsed


def build_chunks(parsed_documents: list[dict] | None = None) -> list[DocumentChunk]:
    if parsed_documents is None:
        parsed_documents = read_jsonl(get_settings().metadata_dir / "documents.jsonl")

    chunks: list[DocumentChunk] = []
    for item in parsed_documents:
        metadata = infer_document_metadata(get_settings().documents_dir / item["source_path"])
        pages = [PageText(**page) for page in item["pages"]]
        chunks.extend(chunk_pages(pages, metadata, item["file_hash"]))

    write_jsonl(get_settings().metadata_dir / "chunks.jsonl", [chunk.to_dict() for chunk in chunks])
    return chunks


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        for row in rows:
            file.write(json.dumps(row, ensure_ascii=False) + "\n")


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as file:
        return [json.loads(line) for line in file if line.strip()]
