from datetime import datetime

from app.schemas import CamelModel


class DocumentSummary(CamelModel):
    id: str
    transcript_id: str
    title: str
    type: str
    model: str
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(CamelModel):
    items: list[DocumentSummary]


class DocumentResponse(CamelModel):
    id: str
    transcript_id: str
    title: str
    type: str
    markdown: str
    model: str
    prompt_version: str
    created_at: datetime
    updated_at: datetime


class UpdateDocumentRequest(CamelModel):
    title: str | None = None
    markdown: str | None = None


class UpdateDocumentResponse(CamelModel):
    id: str
    title: str
    markdown: str
    updated_at: datetime
