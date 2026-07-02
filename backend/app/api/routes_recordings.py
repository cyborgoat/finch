from fastapi import APIRouter, Depends

from app.api.deps import (
    get_note_service,
    get_recording_service,
    get_recording_speaker_service,
    get_transcription_job_service,
)
from app.domains.jobs.transcription_jobs import TranscriptionJobService
from app.domains.recordings.note_service import NoteService
from app.domains.recordings.presenter import to_recording_response, to_recording_summary
from app.domains.recordings.recording_service import RecordingService
from app.domains.recordings.speaker_service import RecordingSpeakerService
from app.schemas.audio import OkResponse
from app.schemas.recording import (
    CreateRecordingRequest,
    CreateRecordingResponse,
    RecordingListResponse,
    RecordingResponse,
    UpdateRecordingRequest,
    UpdateRecordingResponse,
)
from app.schemas.recording_speakers import (
    UpdateRecordingSpeakersRequest,
    UpdateRecordingSpeakersResponse,
)

router = APIRouter(prefix="/recordings", tags=["recordings"])


@router.post("", response_model=CreateRecordingResponse)
def create_recording_job(
    payload: CreateRecordingRequest,
    job_service: TranscriptionJobService = Depends(get_transcription_job_service),
) -> CreateRecordingResponse:
    result = job_service.create_job(
        audio_asset_id=payload.audio_asset_id,
        language=payload.language,
    )
    return CreateRecordingResponse(
        job_id=result.job.id,
        recording_id=result.recording.id,
        status=result.job.status,
    )


@router.get("", response_model=RecordingListResponse)
def list_recordings(
    service: RecordingService = Depends(get_recording_service),
) -> RecordingListResponse:
    items = [
        to_recording_summary(item.recording, item.duration_seconds)
        for item in service.list_with_durations()
    ]
    return RecordingListResponse(items=items)


@router.get("/{recording_id}", response_model=RecordingResponse)
def get_recording(
    recording_id: str,
    service: RecordingService = Depends(get_recording_service),
) -> RecordingResponse:
    return to_recording_response(service.get_recording(recording_id))


@router.patch("/{recording_id}", response_model=UpdateRecordingResponse)
def update_recording(
    recording_id: str,
    payload: UpdateRecordingRequest,
    service: RecordingService = Depends(get_recording_service),
) -> UpdateRecordingResponse:
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
    speaker_service: RecordingSpeakerService = Depends(get_recording_speaker_service),
    recording_service: RecordingService = Depends(get_recording_service),
) -> UpdateRecordingSpeakersResponse:
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
    segments, raw_text = speaker_service.update_speakers(recording_id, mappings)
    transcript = recording_service.get_recording(recording_id)
    return UpdateRecordingSpeakersResponse(
        id=transcript.id,
        speaker_segments=[segment.to_api() for segment in segments],
        raw_text=raw_text,
        updated_at=transcript.updated_at,
    )


@router.delete("/{recording_id}", response_model=OkResponse)
def delete_recording(
    recording_id: str,
    service: RecordingService = Depends(get_recording_service),
    note_service: NoteService = Depends(get_note_service),
) -> OkResponse:
    transcript = service.get_recording(recording_id)
    note_service.delete_by_recording(transcript.id)
    service.delete_recording(transcript)
    return OkResponse()
