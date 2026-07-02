from app.domains.transcription.diarization_service import speaker_segments_from_json
from app.models.recording import Recording
from app.schemas.recording import RecordingResponse, RecordingSummary


def to_recording_summary(
    recording: Recording,
    duration_seconds: float | None = None,
) -> RecordingSummary:
    return RecordingSummary(
        id=recording.id,
        audio_asset_id=recording.audio_asset_id,
        title=recording.title,
        language=recording.language,
        status=recording.status,
        duration_seconds=duration_seconds,
        error_message=recording.error_message,
        processing_note=recording.processing_note,
        created_at=recording.created_at,
        updated_at=recording.updated_at,
    )


def to_recording_response(recording: Recording) -> RecordingResponse:
    segments = speaker_segments_from_json(recording.speaker_segments)
    return RecordingResponse(
        id=recording.id,
        audio_asset_id=recording.audio_asset_id,
        title=recording.title,
        raw_text=recording.raw_text,
        edited_text=recording.edited_text,
        language=recording.language,
        status=recording.status,
        speaker_segments=[segment.to_api() for segment in segments] if segments else None,
        error_message=recording.error_message,
        processing_note=recording.processing_note,
        created_at=recording.created_at,
        updated_at=recording.updated_at,
    )
