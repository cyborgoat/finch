from fastapi import APIRouter, BackgroundTasks, Depends
from sqlmodel import Session, select

from app.models.audio_asset import AudioAsset
from app.models.recording import Recording
from app.schemas.audio import OkResponse
from app.schemas.recording import (
    CreateRecordingRequest,
    CreateRecordingResponse,
    SpeakerSegmentSchema,
    RecordingListResponse,
    RecordingResponse,
    RecordingSummary,
    UpdateRecordingRequest,
    UpdateRecordingResponse,
)
from app.schemas.speaker import (
    UpdateRecordingSpeakersRequest,
    UpdateRecordingSpeakersResponse,
)
from app.services.audio_service import AudioService
from app.services.diarization_service import speaker_segments_from_json
from app.services.note_service import NoteService
from app.services.job_service import JobService
from app.services.recording_service import RecordingService
from app.services.speaker_recording_service import SpeakerRecordingService
from app.storage.database import get_session
from app.workers.transcription_worker import run_transcription_job

router = APIRouter(prefix="/recordings", tags=["recordings"])


def _to_summary(
    transcript: Recording,
    duration_seconds: float | None = None,
) -> RecordingSummary:
    return RecordingSummary(
        id=transcript.id,
        audio_asset_id=transcript.audio_asset_id,
        title=transcript.title,
        language=transcript.language,
        status=transcript.status,
        duration_seconds=duration_seconds,
        error_message=transcript.error_message,
        processing_note=transcript.processing_note,
        created_at=transcript.created_at,
        updated_at=transcript.updated_at,
    )


def _segment_to_schema(segment) -> SpeakerSegmentSchema:
    return SpeakerSegmentSchema(
        speaker=segment.speaker,
        start_sec=segment.start_sec,
        end_sec=segment.end_sec,
        text=segment.text,
        cluster_id=segment.cluster_id,
        speaker_profile_id=segment.speaker_profile_id,
        match_confidence=segment.match_confidence,
        match_status=segment.match_status,
    )


def _to_response(transcript: Recording) -> RecordingResponse:
    segments = speaker_segments_from_json(transcript.speaker_segments)
    return RecordingResponse(
        id=transcript.id,
        audio_asset_id=transcript.audio_asset_id,
        title=transcript.title,
        raw_text=transcript.raw_text,
        edited_text=transcript.edited_text,
        language=transcript.language,
        status=transcript.status,
        speaker_segments=[_segment_to_schema(segment) for segment in segments]
        if segments
        else None,
        error_message=transcript.error_message,
        processing_note=transcript.processing_note,
        created_at=transcript.created_at,
        updated_at=transcript.updated_at,
    )


@router.post("", response_model=CreateRecordingResponse)
def create_recording_job(
    payload: CreateRecordingRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
) -> CreateRecordingResponse:
    audio_service = AudioService(session)
    audio_asset = audio_service.get_audio(payload.audio_asset_id)

    title = audio_asset.filename.rsplit(".", 1)[0] or "Untitled Recording"
    recording_service = RecordingService(session)
    transcript = recording_service.create_recording(
        audio_asset_id=audio_asset.id,
        title=title,
        raw_text="",
        status="transcribing",
    )

    job_service = JobService(session)
    job = job_service.create_job("transcription")
    job_service.update_job(job, result_id=transcript.id)
    background_tasks.add_task(
        run_transcription_job,
        job.id,
        payload.audio_asset_id,
        payload.language,
    )
    return CreateRecordingResponse(
        job_id=job.id,
        recording_id=transcript.id,
        status=job.status,
    )


@router.get("", response_model=RecordingListResponse)
def list_recordings(session: Session = Depends(get_session)) -> RecordingListResponse:
    service = RecordingService(session)
    transcripts = service.list_recordings()
    audio_ids = {transcript.audio_asset_id for transcript in transcripts}
    duration_by_audio_id: dict[str, float | None] = {}
    if audio_ids:
        audio_assets = session.exec(
            select(AudioAsset).where(AudioAsset.id.in_(audio_ids))
        ).all()
        duration_by_audio_id = {
            asset.id: asset.duration_seconds for asset in audio_assets
        }
    items = [
        _to_summary(
            transcript,
            duration_by_audio_id.get(transcript.audio_asset_id),
        )
        for transcript in transcripts
    ]
    return RecordingListResponse(items=items)


@router.get("/{recording_id}", response_model=RecordingResponse)
def get_recording(
    recording_id: str,
    session: Session = Depends(get_session),
) -> RecordingResponse:
    service = RecordingService(session)
    return _to_response(service.get_recording(recording_id))


@router.patch("/{recording_id}", response_model=UpdateRecordingResponse)
def update_recording(
    recording_id: str,
    payload: UpdateRecordingRequest,
    session: Session = Depends(get_session),
) -> UpdateRecordingResponse:
    service = RecordingService(session)
    transcript = service.get_recording(recording_id)
    updated = service.update_recording(
        transcript,
        title=payload.title,
        edited_text=payload.edited_text,
        status=payload.status,
    )
    return UpdateRecordingResponse(
        id=updated.id,
        title=updated.title,
        edited_text=updated.edited_text,
        status=updated.status,
        updated_at=updated.updated_at,
    )


@router.patch("/{recording_id}/speakers", response_model=UpdateRecordingSpeakersResponse)
def update_recording_speakers(
    recording_id: str,
    payload: UpdateRecordingSpeakersRequest,
    session: Session = Depends(get_session),
) -> UpdateRecordingSpeakersResponse:
    service = SpeakerRecordingService(session)
    mappings = [
        {
            "cluster_id": item.cluster_id,
            "display_name": item.display_name,
            "profile_id": item.profile_id,
            "enroll": item.enroll,
            "enroll_start_sec": item.enroll_start_sec,
            "enroll_end_sec": item.enroll_end_sec,
        }
        for item in payload.mappings
    ]
    segments, raw_text = service.update_speakers(recording_id, mappings)
    transcript = RecordingService(session).get_recording(recording_id)
    return UpdateRecordingSpeakersResponse(
        id=transcript.id,
        speaker_segments=[_segment_to_schema(segment) for segment in segments],
        raw_text=raw_text,
        updated_at=transcript.updated_at,
    )


@router.delete("/{recording_id}", response_model=OkResponse)
def delete_recording(
    recording_id: str,
    session: Session = Depends(get_session),
) -> OkResponse:
    service = RecordingService(session)
    note_service = NoteService(session)
    transcript = service.get_recording(recording_id)
    note_service.delete_by_recording(transcript.id)
    service.delete_recording(transcript)
    return OkResponse()
