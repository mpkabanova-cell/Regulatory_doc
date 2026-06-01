#!/usr/bin/env python
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.app.documents.pipeline import build_chunks, parse_all_documents


def main() -> None:
    parsed = parse_all_documents()
    chunks = build_chunks(parsed)
    print(f"Parsed documents: {len(parsed)}")
    print(f"Prepared chunks: {len(chunks)}")


if __name__ == "__main__":
    main()
