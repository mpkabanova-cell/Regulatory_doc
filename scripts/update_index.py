#!/usr/bin/env python
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.app.rag.indexer import DocumentIndexer


def main() -> None:
    stats = DocumentIndexer().index_all(incremental=True)
    for key, value in stats.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
