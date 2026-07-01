import logging

from sqlmodel import Session

from app.config import get_settings
from app.core.errors import AppError
from app.core.startup_diagnostics import log_error_guidance
from app.services.ai_action_service import AiActionService
from app.services.document_service import DocumentService
from app.services.job_service import JobService
from app.services.llm.config import resolve_llm_config
from app.services.llm_settings_service import LlmSettingsService
from app.services.transcript_service import TranscriptService
from app.storage.database import get_engine

logger = logging.getLogger(__name__)


def run_ai_action_job(
    job_id: str,
    transcript_id: str,
    action: str,
    source: str,
    model: str | None = None,
) -> None:
    settings = get_settings()

    with Session(get_engine()) as session:
        job_service = JobService(session, settings)
        transcript_service = TranscriptService(session, settings)
        document_service = DocumentService(session, settings)
        ai_action_service = AiActionService(session, settings)

        job = job_service.get_job(job_id)

        try:
            logger.info(
                "Starting AI action job %s (transcript=%s, action=%s, source=%s)",
                job_id,
                transcript_id,
                action,
                source,
            )
            runtime = LlmSettingsService(session).get_runtime_settings()
            if resolve_llm_config(runtime) is None:
                provider = (runtime.provider or "openrouter").strip().lower()
                logger.warning(
                    "LLM is not configured for provider=%s — job will fail",
                    provider,
                )

            job_service.update_job(job, status="processing", progress=0.2, stage="loading_transcript")
            transcript = transcript_service.get_transcript(transcript_id)

            job_service.update_job(job, progress=0.5, stage="calling_llm")
            title, doc_type, markdown = ai_action_service.run_action(
                transcript,
                action=action,
                source=source,
                model=model,
                session=session,
            )

            resolved_model = model or ai_action_service.llm_service.resolve_default_model()

            job_service.update_job(job, progress=0.8, stage="saving_document")
            document = document_service.create_document(
                transcript_id=transcript.id,
                title=title,
                doc_type=doc_type,
                markdown=markdown,
                model=resolved_model,
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
                doc_type,
            )
        except AppError as exc:
            log_error_guidance(exc.code, exc.message)
            job_service.update_job(
                job,
                status="failed",
                stage=job.stage,
                error=exc.message,
            )
        except Exception as exc:
            logger.exception("AI action job %s failed with unexpected error", job_id)
            job_service.update_job(
                job,
                status="failed",
                stage=job.stage,
                error=str(exc),
            )
