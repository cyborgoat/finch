from fastapi import APIRouter, Depends

from app.api.deps import (
    get_ai_action_service,
    get_job_service,
    get_note_service,
    get_recording_service,
)
from app.core.errors import AppError
from app.domains.ai.action_service import AiActionService
from app.domains.ai.presets import get_preset, list_presets, resolve_action_id
from app.domains.jobs.job_service import JobService
from app.domains.jobs.queue import enqueue_ai_action
from app.domains.recordings.note_service import NoteService
from app.domains.recordings.recording_service import RecordingService
from app.schemas.ai_action import (
    AiActionTemplate,
    AiActionTemplateListResponse,
    CreateAiActionRequest,
    CreateAiActionResponse,
)

router = APIRouter(prefix="/ai-actions", tags=["ai-actions"])


@router.get("/templates", response_model=AiActionTemplateListResponse)
def list_ai_action_templates() -> AiActionTemplateListResponse:
    items = [
        AiActionTemplate(
            id=preset.id,
            title=preset.title,
            description=preset.description,
            note_type=preset.note_type,
        )
        for preset in list_presets()
    ]
    return AiActionTemplateListResponse(items=items)


@router.post("", response_model=CreateAiActionResponse)
def create_ai_action_job(
    payload: CreateAiActionRequest,
    recording_service: RecordingService = Depends(get_recording_service),
    job_service: JobService = Depends(get_job_service),
    ai_action_service: AiActionService = Depends(get_ai_action_service),
    note_service: NoteService = Depends(get_note_service),
) -> CreateAiActionResponse:
    resolved_action = resolve_action_id(payload.action)
    preset = get_preset(resolved_action)
    if preset is None:
        raise AppError("AI_ACTION_INVALID", f"Unknown action: {payload.action}.", 400)

    transcript = recording_service.get_recording(payload.recording_id)

    job = job_service.create_job("ai_action")

    placeholder_title = ai_action_service.build_title(preset.title_prefix, transcript)
    resolved_model = payload.model or ai_action_service.resolve_default_model()

    document = note_service.create_generating_note(
        recording_id=transcript.id,
        title=placeholder_title,
        note_type=preset.note_type,
        generation_job_id=job.id,
        model=resolved_model,
    )
    job_service.update_job(job, result_id=document.id)

    enqueue_ai_action(
        job.id,
        payload.recording_id,
        payload.action,
        payload.source,
        payload.model,
        document.id,
    )
    return CreateAiActionResponse(
        job_id=job.id,
        note_id=document.id,
        status=job.status,
    )
