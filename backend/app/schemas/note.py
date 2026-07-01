from datetime import datetime

from app.schemas import CamelModel


class NoteSummary(CamelModel):
    id: str
    recording_id: str
    title: str
    type: str
    model: str
    status: str
    generation_job_id: str | None = None
    created_at: datetime
    updated_at: datetime


class NoteListResponse(CamelModel):
    items: list[NoteSummary]


class NoteResponse(CamelModel):
    id: str
    recording_id: str
    title: str
    type: str
    markdown: str
    model: str
    prompt_version: str
    status: str
    generation_job_id: str | None = None
    created_at: datetime
    updated_at: datetime


class UpdateNoteRequest(CamelModel):
    title: str | None = None
    markdown: str | None = None


class UpdateNoteResponse(CamelModel):
    id: str
    title: str
    markdown: str
    updated_at: datetime


class CreateNoteRequest(CamelModel):
    recording_id: str
    title: str | None = None
    markdown: str = ""
    type: str = "note"
