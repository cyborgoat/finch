from fastapi import APIRouter, BackgroundTasks, Depends
from sqlmodel import Session

from app.core.errors import AppError
from app.schemas.ai_action import (
    AiActionTemplate,
    AiActionTemplateListResponse,
    CreateAiActionRequest,
    CreateAiActionResponse,
)
from app.services.ai_action_presets import get_preset, list_presets, resolve_action_id
from app.services.ai_action_service import AiActionService
from app.services.note_service import NoteService
from app.services.job_service import JobService
from app.services.recording_service import RecordingService
from app.storage.database import get_session
from app.workers.ai_action_worker import run_ai_action_job

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
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
) -> CreateAiActionResponse:
    resolved_action = resolve_action_id(payload.action)
    preset = get_preset(resolved_action)
    if preset is None:
        raise AppError("AI_ACTION_INVALID", f"Unknown action: {payload.action}.", 400)

    recording_service = RecordingService(session)
    transcript = recording_service.get_recording(payload.recording_id)

    job_service = JobService(session)
    job = job_service.create_job("ai_action")

    ai_action_service = AiActionService(session)
    placeholder_title = ai_action_service.build_title(preset.title_prefix, transcript)
    resolved_model = payload.model or ai_action_service.llm_service.resolve_default_model()

    note_service = NoteService(session)
    document = note_service.create_generating_note(
        recording_id=transcript.id,
        title=placeholder_title,
        note_type=preset.note_type,
        generation_job_id=job.id,
        model=resolved_model,
    )
    job_service.update_job(job, result_id=document.id)

    background_tasks.add_task(
        run_ai_action_job,
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
