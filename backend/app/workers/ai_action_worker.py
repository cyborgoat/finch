import logging

from sqlmodel import Session

from app.config import get_settings
from app.core.errors import AppError
from app.core.startup_diagnostics import log_error_guidance
from app.services.ai_action_service import AiActionService
from app.services.note_service import NoteService
from app.services.job_service import JobService
from app.services.llm.config import resolve_llm_config
from app.services.llm_settings_service import LlmSettingsService
from app.services.recording_service import RecordingService
from app.storage.database import get_engine

logger = logging.getLogger(__name__)


def run_ai_action_job(
    job_id: str,
    recording_id: str,
    action: str,
    source: str,
    model: str | None = None,
    note_id: str | None = None,
) -> None:
    settings = get_settings()

    with Session(get_engine()) as session:
        job_service = JobService(session, settings)
        recording_service = RecordingService(session, settings)
        note_service = NoteService(session, settings)
        ai_action_service = AiActionService(session, settings)

        job = job_service.get_job(job_id)
        document = (
            note_service.get_note(note_id)
            if note_id
            else None
        )

        try:
            logger.info(
                "Starting AI action job %s (transcript=%s, action=%s, source=%s, document=%s)",
                job_id,
                recording_id,
                action,
                source,
                note_id,
            )
            runtime = LlmSettingsService(session).get_runtime_settings()
            if resolve_llm_config(runtime) is None:
                provider = (runtime.provider or "openrouter").strip().lower()
                logger.warning(
                    "LLM is not configured for provider=%s — job will fail",
                    provider,
                )

            job_service.update_job(job, status="processing", progress=0.2, stage="loading_recording")
            transcript = recording_service.get_recording(recording_id)

            job_service.update_job(job, progress=0.5, stage="calling_llm")
            title, note_type, markdown = ai_action_service.run_action(
                transcript,
                action=action,
                source=source,
                model=model,
                session=session,
            )

            resolved_model = model or ai_action_service.llm_service.resolve_default_model()

            job_service.update_job(job, progress=0.8, stage="saving_note")
            if document is None:
                document = note_service.create_note(
                    recording_id=transcript.id,
                    title=title,
                    note_type=note_type,
                    markdown=markdown,
                    model=resolved_model,
                )
            else:
                document = note_service.update_note(
                    document,
                    title=title,
                    markdown=markdown,
                    model=resolved_model,
                    status="ready",
                    clear_generation_job_id=True,
                )

            job_service.update_job(
                job,
                status="completed",
                progress=1.0,
                stage="completed",
                result_id=document.id,
            )
            logger.info(
                "AI action job %s completed — document %s (%s)",
                job_id,
                document.id,
                note_type,
            )
        except AppError as exc:
            log_error_guidance(exc.code, exc.message)
            if document is not None:
                note_service.update_note(document, status="failed")
            job_service.update_job(
                job,
                status="failed",
                stage=job.stage,
                error=exc.message,
            )
        except Exception as exc:
            logger.exception("AI action job %s failed with unexpected error", job_id)
            if document is not None:
                note_service.update_note(document, status="failed")
            job_service.update_job(
                job,
                status="failed",
                stage=job.stage,
                error=str(exc),
            )
