from pathlib import Path

from backend.app.documents.chunking import chunk_pages
from backend.app.documents.extract import PageText
from backend.app.documents.metadata import infer_document_metadata


def test_infers_frp_metadata_from_folder_and_filename() -> None:
    path = Path("documents/frp/ООО/Информатика_7-9_базовый.pdf").resolve()

    metadata = infer_document_metadata(path)

    assert metadata.type == "frp"
    assert metadata.level == "ooo"
    assert metadata.subject == "Информатика"


def test_infers_normative_metadata_from_manifest() -> None:
    path = Path("documents/norm_docs_pack/fgos/fgos_ooo_prikaz_287_2021.pdf").resolve()

    metadata = infer_document_metadata(path)

    assert metadata.type == "fgos"
    assert "ФГОС ООО" in metadata.document
    assert metadata.source_url


def test_chunk_pages_preserves_required_metadata() -> None:
    path = Path("documents/frp/ООО/Информатика_7-9_базовый.pdf").resolve()
    metadata = infer_document_metadata(path)
    text = "Планируемые результаты. " + ("Требование к результатам освоения программы. " * 40)

    chunks = chunk_pages([PageText(page=7, text=text, section="Раздел 1")], metadata, "hash")

    assert chunks
    assert chunks[0].page == 7
    assert chunks[0].type == "frp"
    assert chunks[0].level == "ooo"
    assert chunks[0].subject == "Информатика"
