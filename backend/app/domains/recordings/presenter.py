from app.domains.transcription.diarization_service import speaker_segments_from_json
from app.models.recording import Recording
from app.schemas.recording import RecordingResponse, RecordingSummary

LEGACY_TRANSCRIBED_STATUSES = frozenset({"final", "completed"})


def normalize_recording_status(status: str) -> str:
    if status in LEGACY_TRANSCRIBED_STATUSES:
        return "draft"
    return status


def _resolve_transcription_job_id(
    recording: Recording,
    transcription_job_id: str | None,
) -> str | None:
    if normalize_recording_status(recording.status) != "transcribing":
        return None
    return transcription_job_id


def to_recording_summary(
    recording: Recording,
    duration_seconds: float | None = None,
    *,
    transcription_job_id: str | None = None,
) -> RecordingSummary:
    return RecordingSummary(
        id=recording.id,
        audio_asset_id=recording.audio_asset_id,
        title=recording.title,
        language=recording.language,
        status=normalize_recording_status(recording.status),
        duration_seconds=duration_seconds,
        error_message=recording.error_message,
        processing_note=recording.processing_note,
        transcription_job_id=_resolve_transcription_job_id(
            recording, transcription_job_id
        ),
        created_at=recording.created_at,
        updated_at=recording.updated_at,
    )


def to_recording_response(
    recording: Recording,
    *,
    transcription_job_id: str | None = None,
) -> RecordingResponse:
    segments = speaker_segments_from_json(recording.speaker_segments)
    return RecordingResponse(
        id=recording.id,
        audio_asset_id=recording.audio_asset_id,
        title=recording.title,
        raw_text=recording.raw_text,
        edited_text=recording.edited_text,
        language=recording.language,
        status=normalize_recording_status(recording.status),
        speaker_segments=[segment.to_api() for segment in segments] if segments else None,
        error_message=recording.error_message,
        processing_note=recording.processing_note,
        transcription_job_id=_resolve_transcription_job_id(
            recording, transcription_job_id
        ),
        created_at=recording.created_at,
        updated_at=recording.updated_at,
    )
