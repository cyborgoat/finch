from fastapi import APIRouter, BackgroundTasks, Depends
from sqlmodel import Session

from app.schemas.ai_action import (
    AiActionTemplate,
    AiActionTemplateListResponse,
    CreateAiActionRequest,
    CreateAiActionResponse,
)
from app.services.ai_action_service import AiActionService
from app.services.job_service import JobService
from app.services.transcript_service import TranscriptService
from app.storage.database import get_session
from app.workers.ai_action_worker import run_ai_action_job

router = APIRouter(prefix="/ai-actions", tags=["ai-actions"])


@router.get("/templates", response_model=AiActionTemplateListResponse)
def list_ai_action_templates() -> AiActionTemplateListResponse:
    service = AiActionService()
    items = [AiActionTemplate.model_validate(item) for item in service.list_templates()]
    return AiActionTemplateListResponse(items=items)


@router.post("", response_model=CreateAiActionResponse)
def create_ai_action_job(
    payload: CreateAiActionRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
) -> CreateAiActionResponse:
    transcript_service = TranscriptService(session)
    transcript_service.get_transcript(payload.transcript_id)

    job_service = JobService(session)
    job = job_service.create_job("ai_action")
    background_tasks.add_task(
        run_ai_action_job,
        job.id,
        payload.transcript_id,
        payload.action,
        payload.source,
        payload.model,
        payload.custom_prompt,
    )
    return CreateAiActionResponse(job_id=job.id, status=job.status)
