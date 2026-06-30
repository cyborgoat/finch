from fastapi import APIRouter, BackgroundTasks, Depends
from sqlmodel import Session, select

from app.models.audio_asset import AudioAsset
from app.models.transcript import Transcript
from app.schemas.audio import OkResponse
from app.schemas.transcript import (
    CreateTranscriptRequest,
    CreateTranscriptResponse,
    SpeakerSegmentSchema,
    TranscriptListResponse,
    TranscriptResponse,
    TranscriptSummary,
    UpdateTranscriptRequest,
    UpdateTranscriptResponse,
)
from app.schemas.speaker import (
    UpdateTranscriptSpeakersRequest,
    UpdateTranscriptSpeakersResponse,
)
from app.services.audio_service import AudioService
from app.services.diarization_service import speaker_segments_from_json
from app.services.document_service import DocumentService
from app.services.job_service import JobService
from app.services.transcript_service import TranscriptService
from app.services.speaker_transcript_service import SpeakerTranscriptService
from app.storage.database import get_session
from app.workers.transcription_worker import run_transcription_job

router = APIRouter(prefix="/transcripts", tags=["transcripts"])


def _to_summary(
    transcript: Transcript,
    duration_seconds: float | None = None,
) -> TranscriptSummary:
    return TranscriptSummary(
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


def _to_response(transcript: Transcript) -> TranscriptResponse:
    segments = speaker_segments_from_json(transcript.speaker_segments)
    return TranscriptResponse(
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


@router.post("", response_model=CreateTranscriptResponse)
def create_transcript_job(
    payload: CreateTranscriptRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
) -> CreateTranscriptResponse:
    audio_service = AudioService(session)
    audio_asset = audio_service.get_audio(payload.audio_asset_id)

    title = audio_asset.filename.rsplit(".", 1)[0] or "Untitled Transcript"
    transcript_service = TranscriptService(session)
    transcript = transcript_service.create_transcript(
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
    return CreateTranscriptResponse(
        job_id=job.id,
        transcript_id=transcript.id,
        status=job.status,
    )


@router.get("", response_model=TranscriptListResponse)
def list_transcripts(session: Session = Depends(get_session)) -> TranscriptListResponse:
    service = TranscriptService(session)
    transcripts = service.list_transcripts()
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
    return TranscriptListResponse(items=items)


@router.get("/{transcript_id}", response_model=TranscriptResponse)
def get_transcript(
    transcript_id: str,
    session: Session = Depends(get_session),
) -> TranscriptResponse:
    service = TranscriptService(session)
    return _to_response(service.get_transcript(transcript_id))


@router.patch("/{transcript_id}", response_model=UpdateTranscriptResponse)
def update_transcript(
    transcript_id: str,
    payload: UpdateTranscriptRequest,
    session: Session = Depends(get_session),
) -> UpdateTranscriptResponse:
    service = TranscriptService(session)
    transcript = service.get_transcript(transcript_id)
    updated = service.update_transcript(
        transcript,
        title=payload.title,
        edited_text=payload.edited_text,
        status=payload.status,
    )
    return UpdateTranscriptResponse(
        id=updated.id,
        title=updated.title,
        edited_text=updated.edited_text,
        status=updated.status,
        updated_at=updated.updated_at,
    )


@router.patch("/{transcript_id}/speakers", response_model=UpdateTranscriptSpeakersResponse)
def update_transcript_speakers(
    transcript_id: str,
    payload: UpdateTranscriptSpeakersRequest,
    session: Session = Depends(get_session),
) -> UpdateTranscriptSpeakersResponse:
    service = SpeakerTranscriptService(session)
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
    segments, raw_text = service.update_speakers(transcript_id, mappings)
    transcript = TranscriptService(session).get_transcript(transcript_id)
    return UpdateTranscriptSpeakersResponse(
        id=transcript.id,
        speaker_segments=[_segment_to_schema(segment) for segment in segments],
        raw_text=raw_text,
        updated_at=transcript.updated_at,
    )


@router.delete("/{transcript_id}", response_model=OkResponse)
def delete_transcript(
    transcript_id: str,
    session: Session = Depends(get_session),
) -> OkResponse:
    service = TranscriptService(session)
    document_service = DocumentService(session)
    transcript = service.get_transcript(transcript_id)
    document_service.delete_by_transcript(transcript.id)
    service.delete_transcript(transcript)
    return OkResponse()
