from datetime import datetime

from app.schemas import CamelModel


class SpeakerSegmentSchema(CamelModel):
    speaker: str
    start_sec: float
    end_sec: float
    text: str = ""
    cluster_id: str | None = None
    speaker_profile_id: str | None = None
    match_confidence: float | None = None
    match_status: str | None = None


class CreateTranscriptRequest(CamelModel):
    audio_asset_id: str
    language: str = "auto"


class CreateTranscriptResponse(CamelModel):
    job_id: str
    transcript_id: str
    status: str


class TranscriptSummary(CamelModel):
    id: str
    audio_asset_id: str
    title: str
    language: str | None = None
    status: str
    duration_seconds: float | None = None
    error_message: str | None = None
    processing_note: str | None = None
    created_at: datetime
    updated_at: datetime


class TranscriptListResponse(CamelModel):
    items: list[TranscriptSummary]


class TranscriptResponse(CamelModel):
    id: str
    audio_asset_id: str
    title: str
    raw_text: str
    edited_text: str | None = None
    language: str | None = None
    status: str
    speaker_segments: list[SpeakerSegmentSchema] | None = None
    error_message: str | None = None
    processing_note: str | None = None
    created_at: datetime
    updated_at: datetime


class UpdateTranscriptRequest(CamelModel):
    title: str | None = None
    edited_text: str | None = None
    status: str | None = None


class UpdateTranscriptResponse(CamelModel):
    id: str
    title: str
    edited_text: str | None = None
    status: str
    updated_at: datetime
