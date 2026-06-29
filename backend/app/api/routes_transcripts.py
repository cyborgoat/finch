from fastapi import APIRouter, BackgroundTasks, Depends
from sqlmodel import Session

from app.models.transcript import Transcript
from app.schemas.audio import OkResponse
from app.schemas.transcript import (
    CreateTranscriptRequest,
    CreateTranscriptResponse,
    TranscriptListResponse,
    TranscriptResponse,
    TranscriptSummary,
    UpdateTranscriptRequest,
    UpdateTranscriptResponse,
)
from app.services.audio_service import AudioService
from app.services.job_service import JobService
from app.services.transcript_service import TranscriptService
from app.storage.database import get_session
from app.workers.transcription_worker import run_transcription_job

router = APIRouter(prefix="/transcripts", tags=["transcripts"])


def _to_summary(transcript: Transcript) -> TranscriptSummary:
    return TranscriptSummary.model_validate(transcript)


def _to_response(transcript: Transcript) -> TranscriptResponse:
    return TranscriptResponse.model_validate(transcript)


@router.post("", response_model=CreateTranscriptResponse)
def create_transcript_job(
    payload: CreateTranscriptRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
) -> CreateTranscriptResponse:
    audio_service = AudioService(session)
    audio_service.get_audio(payload.audio_asset_id)

    job_service = JobService(session)
    job = job_service.create_job("transcription")
    background_tasks.add_task(
        run_transcription_job,
        job.id,
        payload.audio_asset_id,
        payload.language,
    )
    return CreateTranscriptResponse(job_id=job.id, status=job.status)


@router.get("", response_model=TranscriptListResponse)
def list_transcripts(session: Session = Depends(get_session)) -> TranscriptListResponse:
    service = TranscriptService(session)
    items = [_to_summary(transcript) for transcript in service.list_transcripts()]
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


@router.delete("/{transcript_id}", response_model=OkResponse)
def delete_transcript(
    transcript_id: str,
    session: Session = Depends(get_session),
) -> OkResponse:
    service = TranscriptService(session)
    transcript = service.get_transcript(transcript_id)
    service.delete_transcript(transcript)
    return OkResponse()
