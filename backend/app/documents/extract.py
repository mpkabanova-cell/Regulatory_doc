from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from docx import Document
from pypdf import PdfReader


@dataclass(frozen=True)
class PageText:
    page: int
    text: str
    section: str | None = None
    heading: str | None = None
    subsection: str | None = None


HEADING_RE = re.compile(
    r"^\s*((?:[IVXLCDM]+\.|\d+(?:\.\d+)*\.?)\s+)?([А-ЯЁA-Z][^.!?]{6,140})\s*$"
)
SECTION_RE = re.compile(r"^\s*((?:Раздел|Глава|Приложение)\s+[^.\n]{1,120})", re.IGNORECASE)
SUBSECTION_RE = re.compile(r"^\s*(\d+(?:\.\d+)+\.?\s+[^.\n]{1,160})")


def extract_document_text(path: Path) -> list[PageText]:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return extract_pdf_text(path)
    if suffix == ".docx":
        return extract_docx_text(path)
    raise ValueError(f"Unsupported document format: {path.suffix}")


def extract_pdf_text(path: Path) -> list[PageText]:
    reader = PdfReader(str(path))
    pages: list[PageText] = []
    section: str | None = None
    heading: str | None = None
    subsection: str | None = None

    for index, page in enumerate(reader.pages, start=1):
        text = normalize_text(page.extract_text() or "")
        section, heading, subsection = detect_structure(text, section, heading, subsection)
        if text:
            pages.append(PageText(page=index, text=text, section=section, heading=heading, subsection=subsection))
    return pages


def extract_docx_text(path: Path) -> list[PageText]:
    doc = Document(str(path))
    paragraphs = [normalize_text(paragraph.text) for paragraph in doc.paragraphs]
    text = "\n".join(paragraph for paragraph in paragraphs if paragraph)
    section, heading, subsection = detect_structure(text, None, None, None)
    return [PageText(page=1, text=text, section=section, heading=heading, subsection=subsection)] if text else []


def normalize_text(text: str) -> str:
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def detect_structure(
    text: str,
    current_section: str | None,
    current_heading: str | None,
    current_subsection: str | None,
) -> tuple[str | None, str | None, str | None]:
    for raw_line in text.splitlines()[:40]:
        line = raw_line.strip()
        if not line:
            continue
        section_match = SECTION_RE.match(line)
        if section_match:
            current_section = section_match.group(1).strip()
        subsection_match = SUBSECTION_RE.match(line)
        if subsection_match:
            current_subsection = subsection_match.group(1).strip()
        heading_match = HEADING_RE.match(line)
        if heading_match and len(line.split()) > 1:
            current_heading = line
    return current_section, current_heading, current_subsection
