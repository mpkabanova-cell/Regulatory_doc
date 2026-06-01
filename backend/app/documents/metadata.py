from __future__ import annotations

import json
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

from backend.app.core.config import get_settings


LEVEL_BY_FOLDER = {"НОО": "noo", "ООО": "ooo", "СОО": "soo"}
NORM_TYPES = {"fgos": "fgos", "profstandart": "profstandart", "sanpin": "sanpin"}
SERVICE_DIRS = {"meta"}
SUPPORTED_SUFFIXES = {".pdf", ".docx"}


@dataclass(frozen=True)
class DocumentMetadata:
    source_path: str
    document: str
    type: str
    level: str | None = None
    subject: str | None = None
    source_url: str | None = None
    source: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def load_manifest() -> dict[str, dict[str, Any]]:
    settings = get_settings()
    manifest_path = settings.documents_dir / "norm_docs_pack" / "meta" / "manifest.json"
    if not manifest_path.exists():
        return {}
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    return {entry["file"]: entry for entry in data if "file" in entry}


def discover_document_paths() -> list[Path]:
    settings = get_settings()
    roots = [settings.documents_dir / "frp", settings.documents_dir / "norm_docs_pack"]
    paths: list[Path] = []
    for root in roots:
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if path.is_file() and path.suffix.lower() in SUPPORTED_SUFFIXES:
                if "norm_docs_pack/meta" in path.as_posix():
                    continue
                paths.append(path)
    return sorted(paths)


def infer_document_metadata(path: Path, manifest: dict[str, dict[str, Any]] | None = None) -> DocumentMetadata:
    settings = get_settings()
    manifest = manifest if manifest is not None else load_manifest()
    relative = path.relative_to(settings.documents_dir).as_posix()
    parts = path.relative_to(settings.documents_dir).parts

    if parts[0] == "frp":
        level = LEVEL_BY_FOLDER.get(parts[1]) if len(parts) > 1 else None
        subject = infer_subject(path.stem)
        return DocumentMetadata(
            source_path=relative,
            document=f"ФРП {subject}" if subject else path.stem,
            type="frp",
            level=level,
            subject=subject,
        )

    if parts[0] == "norm_docs_pack" and len(parts) > 1:
        norm_dir = parts[1]
        if norm_dir in SERVICE_DIRS:
            raise ValueError(f"Service metadata file must not be indexed: {relative}")
        doc_type = NORM_TYPES.get(norm_dir, norm_dir)
        manifest_key = "/".join(parts[1:])
        manifest_entry = manifest.get(manifest_key, {})
        return DocumentMetadata(
            source_path=relative,
            document=manifest_entry.get("title") or humanize_filename(path.stem),
            type=doc_type,
            source_url=manifest_entry.get("source_url"),
            source=manifest_entry.get("source"),
        )

    return DocumentMetadata(
        source_path=relative,
        document=humanize_filename(path.stem),
        type="unknown",
    )


def infer_subject(stem: str) -> str:
    name = re.sub(r"_(\d|базовый|углублённый|углубленный).*$", "", stem, flags=re.IGNORECASE)
    name = name.replace("_", " ").strip()
    replacements = {
        "ИЗО": "ИЗО",
        "ОБЗР": "ОБЗР",
        "ОРКСЭ": "ОРКСЭ",
    }
    return replacements.get(name, name)


def humanize_filename(stem: str) -> str:
    return stem.replace("_", " ").replace("-", " ").strip()
