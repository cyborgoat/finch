from fastapi import APIRouter, Depends

from app.api.deps import (
    get_job_service,
    get_note_service,
    get_recording_service,
    get_recording_source_edit_service,
    get_recording_speaker_service,
    get_transcription_job_service,
)
from app.domains.jobs.job_service import JobService
from app.domains.jobs.transcription_jobs import TranscriptionJobService
from app.domains.recordings.note_service import NoteService
from app.domains.recordings.presenter import (
    normalize_recording_status,
    to_recording_response,
    to_recording_summary,
)
from app.domains.recordings.recording_service import RecordingService
from app.domains.recordings.recording_source_edit_service import RecordingSourceEditService
from app.domains.recordings.speaker_service import RecordingSpeakerService
from app.schemas.audio import OkResponse
from app.schemas.recording import (
    CreateRecordingRequest,
    CreateRecordingResponse,
    EditRecordingSourceRequest,
    EditRecordingSourceResponse,
    RecordingListResponse,
    RecordingResponse,
    SpeakerSegmentSchema,
    StartTranscriptionRequest,
    StartTranscriptionResponse,
    UpdateRecordingRequest,
    UpdateRecordingResponse,
)
from app.schemas.recording_speakers import (
    UpdateRecordingSpeakersRequest,
    UpdateRecordingSpeakersResponse,
)

router = APIRouter(prefix="/recordings", tags=["recordings"])


def _lookup_transcription_job_id(
    job_service: JobService,
    recording_id: str,
    status: str,
) -> str | None:
    if status != "transcribing":
        return None
    active_job = job_service.get_active_job_for_result(recording_id, "transcription")
    return active_job.id if active_job else None


@router.post("", response_model=CreateRecordingResponse)
def create_recording(
    payload: CreateRecordingRequest,
    job_service: TranscriptionJobService = Depends(get_transcription_job_service),
) -> CreateRecordingResponse:
    result = job_service.create_recording(audio_asset_id=payload.audio_asset_id)
    return CreateRecordingResponse(
        recording_id=result.recording.id,
        status=result.recording.status,
    )


@router.post("/{recording_id}/transcribe", response_model=StartTranscriptionResponse)
def start_transcription(
    recording_id: str,
    payload: StartTranscriptionRequest,
    job_service: TranscriptionJobService = Depends(get_transcription_job_service),
) -> StartTranscriptionResponse:
    result = job_service.start_transcription(
        recording_id,
        language=payload.language,
        regenerate=payload.regenerate,
    )
    return StartTranscriptionResponse(
        job_id=result.job.id,
        recording_id=result.recording.id,
        status=result.job.status,
    )


@router.get("", response_model=RecordingListResponse)
def list_recordings(
    service: RecordingService = Depends(get_recording_service),
    job_service: JobService = Depends(get_job_service),
) -> RecordingListResponse:
    items = []
    for item in service.list_with_durations():
        status = normalize_recording_status(item.recording.status)
        items.append(
            to_recording_summary(
                item.recording,
                item.duration_seconds,
                transcription_job_id=_lookup_transcription_job_id(
                    job_service,
                    item.recording.id,
                    status,
                ),
            )
        )
    return RecordingListResponse(items=items)


@router.get("/{recording_id}", response_model=RecordingResponse)
def get_recording(
    recording_id: str,
    service: RecordingService = Depends(get_recording_service),
    job_service: JobService = Depends(get_job_service),
) -> RecordingResponse:
    recording = service.get_recording(recording_id)
    status = normalize_recording_status(recording.status)
    return to_recording_response(
        recording,
        transcription_job_id=_lookup_transcription_job_id(
            job_service,
            recording_id,
            status,
        ),
    )


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
    )
    return UpdateRecordingResponse(
        id=updated.id,
        title=updated.title,
        edited_text=updated.edited_text,
        status=updated.status,
        updated_at=updated.updated_at,
    )


@router.post("/{recording_id}/edit-source", response_model=EditRecordingSourceResponse)
def edit_recording_source(
    recording_id: str,
    payload: EditRecordingSourceRequest,
    service: RecordingSourceEditService = Depends(get_recording_source_edit_service),
) -> EditRecordingSourceResponse:
    result = service.edit_source(
        recording_id,
        trim_start_sec=payload.trim_start_sec,
        trim_end_sec=payload.trim_end_sec,
        remove_silence=payload.remove_silence,
        mode=payload.mode,
    )
    return EditRecordingSourceResponse(
        recording_id=result.recording_id,
        audio_asset_id=result.audio_asset_id,
        status=result.status,
        duration_seconds=result.duration_seconds,
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
        }
        for item in payload.mappings
    ]
    segments, raw_text = speaker_service.update_speakers(recording_id, mappings)
    transcript = recording_service.get_recording(recording_id)
    return UpdateRecordingSpeakersResponse(
        id=transcript.id,
        speaker_segments=[
            SpeakerSegmentSchema.model_validate(segment.model_dump()) for segment in segments
        ],
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
