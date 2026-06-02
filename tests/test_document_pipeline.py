from pathlib import Path

from backend.app.documents.chunking import chunk_pages
from backend.app.documents.extract import PageText
from backend.app.documents.metadata import infer_document_metadata
from backend.app.models.schemas import Source
from backend.app.rag.prompts import METHODIST_SYSTEM_PROMPT
from backend.app.rag.service import build_clarification_question, infer_level, infer_subject, rank_and_dedupe_sources
from backend.app.rag.vector_store import trim_quote


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


def test_trim_quote_starts_from_numbered_point() -> None:
    quote = trim_quote(
        "щения для обработки уборочного инвентаря. 3.4.14. Количество обучающихся в классе "
        "определяется исходя из расчета соблюдения нормы площади."
    )

    assert quote.startswith("3.4.14. Количество обучающихся")


def test_trim_quote_drops_overlap_fragment_before_sentence() -> None:
    quote = trim_quote(
        "который был начат в предыдущем фрагменте. Образовательная организация обеспечивает условия обучения."
    )

    assert quote.startswith("Образовательная организация")


def test_infers_subject_and_level_from_question() -> None:
    assert infer_subject("Какие результаты по информатике в 8 классе?") == "Информатика"
    assert infer_level("Какие результаты по информатике в 8 классе?") == "ooo"


def test_ranks_matching_subject_before_nearby_other_subjects() -> None:
    math_source = Source(
        document="ФРП Математика",
        quote="результаты обучения",
        source_path="math.pdf",
        type="frp",
        subject="Математика",
        level="ooo",
        score=0.95,
    )
    informatics_source = Source(
        document="ФРП Информатика",
        quote="результаты обучения",
        source_path="informatics.pdf",
        type="frp",
        subject="Информатика",
        level="ooo",
        score=0.7,
    )

    ranked = rank_and_dedupe_sources([math_source, informatics_source], subject="Информатика", level="ooo")

    assert ranked[0].document == "ФРП Информатика"


def test_clarifies_subject_for_subject_results_request() -> None:
    clarification = build_clarification_question("Предметные результаты в 5 классе", subject=None, level="ooo")

    assert clarification
    assert "предмет" in clarification


def test_does_not_clarify_when_subject_and_level_are_known() -> None:
    clarification = build_clarification_question(
        "Предметные результаты по информатике в 5 классе",
        subject="Информатика",
        level="ooo",
    )

    assert clarification is None


def test_methodist_prompt_keeps_core_work_directions_and_normative_limit() -> None:
    assert "Создание текстов" in METHODIST_SYSTEM_PROMPT
    assert "Планирование учебного процесса" in METHODIST_SYSTEM_PROMPT
    assert "Методические рекомендации" in METHODIST_SYSTEM_PROMPT
    assert "Нормативные выводы" in METHODIST_SYSTEM_PROMPT
