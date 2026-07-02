from fastapi import APIRouter, Depends

from app.api.deps import get_ai_action_job_service
from app.domains.ai.action_jobs import AiActionJobService
from app.domains.ai.action_presets import list_presets
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
    job_service: AiActionJobService = Depends(get_ai_action_job_service),
) -> CreateAiActionResponse:
    result = job_service.create_job(
        recording_id=payload.recording_id,
        action=payload.action,
        source=payload.source,
        model=payload.model,
    )
    return CreateAiActionResponse(
        job_id=result.job.id,
        note_id=result.note.id,
        status=result.job.status,
    )
