from __future__ import annotations

import hashlib
from dataclasses import dataclass, asdict
from typing import Any

from backend.app.core.config import get_settings
from backend.app.documents.extract import PageText
from backend.app.documents.metadata import DocumentMetadata


@dataclass(frozen=True)
class DocumentChunk:
    id: str
    text: str
    document: str
    section: str | None
    heading: str | None
    subsection: str | None
    page: int
    subject: str | None
    level: str | None
    type: str
    source_path: str
    source_url: str | None
    file_hash: str
    chunk_index: int

    def metadata(self) -> dict[str, Any]:
        data = asdict(self)
        data.pop("text")
        data.pop("id")
        return {key: value for key, value in data.items() if value is not None}

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        return data


def file_sha256(path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as file:
        for block in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def chunk_pages(pages: list[PageText], metadata: DocumentMetadata, file_hash: str) -> list[DocumentChunk]:
    settings = get_settings()
    chunks: list[DocumentChunk] = []
    chunk_index = 0

    for page in pages:
        text = page.text.strip()
        start = 0
        while start < len(text):
            end = min(start + settings.chunk_max_chars, len(text))
            if end < len(text):
                boundary = max(text.rfind("\n", start, end), text.rfind(". ", start, end))
                if boundary - start >= settings.chunk_min_chars:
                    end = boundary + 1
            chunk_text = text[start:end].strip()
            if len(chunk_text) >= 120:
                chunk_id = stable_chunk_id(metadata.source_path, file_hash, chunk_index)
                chunks.append(
                    DocumentChunk(
                        id=chunk_id,
                        text=chunk_text,
                        document=metadata.document,
                        section=page.section,
                        heading=page.heading,
                        subsection=page.subsection,
                        page=page.page,
                        subject=metadata.subject,
                        level=metadata.level,
                        type=metadata.type,
                        source_path=metadata.source_path,
                        source_url=metadata.source_url,
                        file_hash=file_hash,
                        chunk_index=chunk_index,
                    )
                )
                chunk_index += 1
            if end >= len(text):
                break
            start = max(end - settings.chunk_overlap, start + 1)

    return chunks


def stable_chunk_id(source_path: str, file_hash: str, chunk_index: int) -> str:
    raw = f"{source_path}:{file_hash}:{chunk_index}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()
