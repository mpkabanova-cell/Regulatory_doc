from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.checks.service import CheckService
from backend.app.core.config import PROJECT_ROOT, get_settings
from backend.app.documents.metadata import discover_document_paths, infer_document_metadata, load_manifest
from backend.app.models.schemas import ChatRequest, ChatResponse, CheckRequest, CheckResponse, UploadResponse
from backend.app.rag.service import RagService
from backend.app.rag.store_factory import RetrievalStore, create_retrieval_store


settings = get_settings()
app = FastAPI(title=settings.app_name)
cors_origins = settings.cors_origin_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials="*" not in cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

_vector_store: RetrievalStore | None = None
_rag_service: RagService | None = None
_check_service: CheckService | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/stats")
def stats() -> dict[str, int]:
    manifest = load_manifest()
    documents = [infer_document_metadata(path, manifest) for path in discover_document_paths()]
    return {
        "documents": len(documents),
        "frp": sum(1 for document in documents if document.type == "frp"),
        "fgos": sum(1 for document in documents if document.type == "fgos"),
        "sanpin": sum(1 for document in documents if document.type == "sanpin"),
        "profstandart": sum(1 for document in documents if document.type == "profstandart"),
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    return await get_rag_service().chat(
        request.message,
        top_k=request.top_k,
        document_type=request.document_type,
        level=request.level,
        subject=request.subject,
        history=request.history,
    )


@app.post("/upload", response_model=UploadResponse)
async def upload(file: UploadFile = File(...)) -> UploadResponse:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".pdf", ".docx"}:
        raise HTTPException(status_code=400, detail="Поддерживаются только PDF и DOCX.")

    upload_id = str(uuid4())
    target = settings.uploads_dir / f"{upload_id}{suffix}"
    size_limit = settings.max_upload_mb * 1024 * 1024
    written = 0
    with target.open("wb") as output:
        while chunk := await file.read(1024 * 1024):
            written += len(chunk)
            if written > size_limit:
                target.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="Файл слишком большой.")
            output.write(chunk)

    metadata_path = settings.uploads_dir / f"{upload_id}.name"
    metadata_path.write_text(file.filename or target.name, encoding="utf-8")
    return UploadResponse(upload_id=upload_id, filename=file.filename or target.name, content_type=file.content_type)


@app.post("/check", response_model=CheckResponse)
async def check(request: CheckRequest) -> CheckResponse:
    upload_path = resolve_upload(request.upload_id)
    return await get_check_service().check_document(upload_path, request.document_type)


def resolve_upload(upload_id: str) -> Path:
    for suffix in (".pdf", ".docx"):
        candidate = settings.uploads_dir / f"{upload_id}{suffix}"
        if candidate.exists():
            return candidate
    raise HTTPException(status_code=404, detail="Загруженный файл не найден.")


def get_vector_store() -> RetrievalStore:
    global _vector_store
    if _vector_store is None:
        _vector_store = create_retrieval_store()
    return _vector_store


def get_rag_service() -> RagService:
    global _rag_service
    if _rag_service is None:
        _rag_service = RagService(get_vector_store())
    return _rag_service


def get_check_service() -> CheckService:
    global _check_service
    if _check_service is None:
        _check_service = CheckService(get_vector_store())
    return _check_service


frontend_dist = PROJECT_ROOT / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
