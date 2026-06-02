from typing import Literal

from pydantic import BaseModel, Field


class Source(BaseModel):
    document: str
    section: str | None = None
    page: int | None = None
    quote: str
    source_path: str
    source_url: str | None = None
    type: str
    level: str | None = None
    subject: str | None = None
    score: float | None = None


class ChatHistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=2)
    top_k: int | None = Field(default=None, ge=1, le=15)
    document_type: str | None = None
    level: str | None = None
    subject: str | None = None
    history: list[ChatHistoryMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source]
    refusal: bool = False


class UploadResponse(BaseModel):
    upload_id: str
    filename: str
    content_type: str | None = None


class CheckRequest(BaseModel):
    upload_id: str
    document_type: str = Field(
        default="учебный материал",
        description="КТП, рабочая программа, план урока или методическая разработка.",
    )


class ComplianceRow(BaseModel):
    requirement: str
    status: str
    comment: str
    source: Source | None = None


class CheckResponse(BaseModel):
    rows: list[ComplianceRow]
    summary: str
    sources: list[Source]
