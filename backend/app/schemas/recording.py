from datetime import datetime
from typing import Literal

from app.domains.transcription.types import SpeakerSegment
from app.schemas import CamelModel


class SpeakerSegmentSchema(SpeakerSegment, CamelModel):
    pass


class CreateRecordingRequest(CamelModel):
    audio_asset_id: str


class CreateRecordingResponse(CamelModel):
    recording_id: str
    status: str


class StartTranscriptionRequest(CamelModel):
    language: str = "auto"
    regenerate: bool = False


class StartTranscriptionResponse(CamelModel):
    job_id: str
    recording_id: str
    status: str


class RecordingSummary(CamelModel):
    id: str
    audio_asset_id: str
    title: str
    language: str | None = None
    status: str
    duration_seconds: float | None = None
    error_message: str | None = None
    processing_note: str | None = None
    transcription_job_id: str | None = None
    created_at: datetime
    updated_at: datetime


class RecordingListResponse(CamelModel):
    items: list[RecordingSummary]


class RecordingResponse(CamelModel):
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
    transcription_job_id: str | None = None
    created_at: datetime
    updated_at: datetime


class UpdateRecordingRequest(CamelModel):
    title: str | None = None
    edited_text: str | None = None


class UpdateRecordingResponse(CamelModel):
    id: str
    title: str
    edited_text: str | None = None
    status: str
    updated_at: datetime


class EditRecordingSourceRequest(CamelModel):
    trim_start_sec: float = 0.0
    trim_end_sec: float | None = None
    remove_silence: bool = False
    mode: Literal["replace", "save_as_new"]


class EditRecordingSourceResponse(CamelModel):
    recording_id: str
    audio_asset_id: str
    status: str
    duration_seconds: float | None = None
