from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.models.note import Note
from app.schemas.audio import OkResponse
from app.schemas.note import (
    CreateNoteRequest,
    NoteListResponse,
    NoteResponse,
    NoteSummary,
    UpdateNoteRequest,
    UpdateNoteResponse,
)
from app.services.note_service import NoteService
from app.services.recording_service import RecordingService
from app.storage.database import get_session

router = APIRouter(prefix="/notes", tags=["notes"])


def _to_summary(document: Note) -> NoteSummary:
    return NoteSummary.model_validate(document)


def _to_response(document: Note) -> NoteResponse:
    return NoteResponse.model_validate(document)


@router.get("", response_model=NoteListResponse)
def list_notes(
    recording_id: str | None = Query(None, alias="recordingId"),
    session: Session = Depends(get_session),
) -> NoteListResponse:
    service = NoteService(session)
    items = [_to_summary(document) for document in service.list_notes(recording_id)]
    return NoteListResponse(items=items)


@router.post("", response_model=NoteResponse)
def create_note(
    payload: CreateNoteRequest,
    session: Session = Depends(get_session),
) -> NoteResponse:
    recording_service = RecordingService(session)
    recording_service.get_recording(payload.recording_id)

    service = NoteService(session)
    document = service.create_manual_note(
        recording_id=payload.recording_id,
        title=payload.title,
        markdown=payload.markdown,
        note_type=payload.type,
    )
    return _to_response(document)


@router.get("/{note_id}", response_model=NoteResponse)
def get_note(
    note_id: str,
    session: Session = Depends(get_session),
) -> NoteResponse:
    service = NoteService(session)
    return _to_response(service.get_note(note_id))


@router.patch("/{note_id}", response_model=UpdateNoteResponse)
def update_note(
    note_id: str,
    payload: UpdateNoteRequest,
    session: Session = Depends(get_session),
) -> UpdateNoteResponse:
    service = NoteService(session)
    document = service.get_note(note_id)
    updated = service.update_note(
        document,
        title=payload.title,
        markdown=payload.markdown,
    )
    return UpdateNoteResponse(
        id=updated.id,
        title=updated.title,
        markdown=updated.markdown,
        updated_at=updated.updated_at,
    )


@router.delete("/{note_id}", response_model=OkResponse)
def delete_note(
    note_id: str,
    session: Session = Depends(get_session),
) -> OkResponse:
    service = NoteService(session)
    document = service.get_note(note_id)
    service.delete_note(document)
    return OkResponse()
