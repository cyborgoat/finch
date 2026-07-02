import logging
from dataclasses import dataclass

from sqlmodel import Session

from app.capabilities.error_catalog import log_error_guidance
from app.config import Settings, get_settings
from app.core.enums import JobStatus, NoteStatus
from app.core.errors import AppError
from app.domains.ai.action_service import AiActionService
from app.domains.ai.llm.config import resolve_llm_config
from app.domains.ai.llm.runtime import LlmRuntimeSettings
from app.domains.jobs.job_service import JobService
from app.domains.recordings.note_service import NoteService
from app.domains.recordings.recording_service import RecordingService
from app.domains.settings.llm_settings_service import LlmSettingsService
from app.domains.settings.user_settings_service import UserSettingsService
from app.schemas.user_settings import UserSettingsResponse
from app.storage.database import get_engine

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class _PreparedLlmCall:
    job_id: str
    recording_id: str
    note_id: str | None
    action: str
    source: str
    model: str | None
    runtime: LlmRuntimeSettings
    user_settings: UserSettingsResponse
    transcript_text: str


@dataclass(frozen=True)
class _LlmResult:
    title: str
    note_type: str
    markdown: str
    resolved_model: str


class AiActionPipeline:
    def __init__(self, session: Session, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.job_service = JobService(session)
        self.recording_service = RecordingService(session)
        self.note_service = NoteService(session)
        self.ai_action_service = AiActionService(session, self.settings)

    def run(
        self,
        job_id: str,
        recording_id: str,
        action: str,
        source: str,
        model: str | None = None,
        note_id: str | None = None,
    ) -> None:
        prepared: _PreparedLlmCall | None = None
        try:
            prepared = self._prepare_for_llm(
                job_id,
                recording_id,
                action,
                source,
                model,
                note_id,
            )
        except AppError as exc:
            self._mark_failed(job_id, note_id, exc)
            return
        except Exception as exc:
            logger.exception("AI action job %s failed before LLM call", job_id)
            self._mark_failed(job_id, note_id, exc, unexpected=True)
            return

        self.session.close()

        try:
            llm_result = self._execute_llm(prepared)
        except AppError as exc:
            self._mark_failed_in_new_session(job_id, note_id, exc, stage="calling_llm")
            return
        except Exception as exc:
            logger.exception("AI action job %s failed during LLM call", job_id)
            self._mark_failed_in_new_session(
                job_id,
                note_id,
                exc,
                stage="calling_llm",
                unexpected=True,
            )
            return

        try:
            self._persist_result_in_new_session(prepared, llm_result)
        except AppError as exc:
            self._mark_failed_in_new_session(job_id, note_id, exc, stage="saving_note")
        except Exception as exc:
            logger.exception("AI action job %s failed while saving note", job_id)
            self._mark_failed_in_new_session(
                job_id,
                note_id,
                exc,
                stage="saving_note",
                unexpected=True,
            )

    def _prepare_for_llm(
        self,
        job_id: str,
        recording_id: str,
        action: str,
        source: str,
        model: str | None,
        note_id: str | None,
    ) -> _PreparedLlmCall:
        logger.info(
            "Starting AI action job %s (transcript=%s, action=%s, source=%s, document=%s)",
            job_id,
            recording_id,
            action,
            source,
            note_id,
        )
        runtime = LlmSettingsService(self.session).get_runtime_settings()
        if resolve_llm_config(runtime) is None:
            provider = (runtime.provider or "openrouter").strip().lower()
            logger.warning(
                "LLM is not configured for provider=%s — job will fail",
                provider,
            )

        job = self.job_service.get_job(job_id)
        self.job_service.update_job(
            job,
            status=JobStatus.PROCESSING,
            progress=0.2,
            stage="loading_recording",
        )
        transcript = self.recording_service.get_recording(recording_id)
        user_settings = UserSettingsService(self.session).get_settings()
        transcript_text = self.ai_action_service.resolve_transcript_text(transcript, source)
        if not transcript_text:
            raise AppError("AI_ACTION_INVALID", "Transcript text is empty.", 400)

        self.job_service.update_job(job, progress=0.5, stage="calling_llm")
        return _PreparedLlmCall(
            job_id=job_id,
            recording_id=recording_id,
            note_id=note_id,
            action=action,
            source=source,
            model=model,
            runtime=runtime,
            user_settings=user_settings,
            transcript_text=transcript_text,
        )

    @staticmethod
    def _execute_llm(prepared: _PreparedLlmCall) -> _LlmResult:
        ai_action_service = AiActionService(session=None, settings=get_settings())
        title, note_type, markdown = ai_action_service.run_action_from_text(
            action=prepared.action,
            transcript_text=prepared.transcript_text,
            model=prepared.model,
            runtime=prepared.runtime,
            user_settings=prepared.user_settings,
            recording_id=prepared.recording_id,
        )
        logger.info(
            "LLM finished for job %s (%d chars, type=%s)",
            prepared.job_id,
            len(markdown),
            note_type,
        )
        resolved_model = prepared.model or ai_action_service.resolve_default_model(
            prepared.runtime,
        )
        return _LlmResult(
            title=title,
            note_type=note_type,
            markdown=markdown,
            resolved_model=resolved_model,
        )

    def _persist_result_in_new_session(
        self,
        prepared: _PreparedLlmCall,
        llm_result: _LlmResult,
    ) -> None:
        with Session(get_engine()) as session:
            AiActionPipeline(session, self.settings)._persist_result(prepared, llm_result)

    def _mark_failed_in_new_session(
        self,
        job_id: str,
        note_id: str | None,
        exc: Exception,
        *,
        stage: str | None = None,
        unexpected: bool = False,
    ) -> None:
        with Session(get_engine()) as session:
            AiActionPipeline(session, self.settings)._mark_failed(
                job_id,
                note_id,
                exc,
                stage=stage,
                unexpected=unexpected,
            )

    def _persist_result(self, prepared: _PreparedLlmCall, llm_result: _LlmResult) -> None:
        job = self.job_service.get_job(prepared.job_id)
        document = (
            self.note_service.get_note(prepared.note_id) if prepared.note_id else None
        )

        self.job_service.update_job(job, progress=0.8, stage="saving_note")
        if document is None:
            document = self.note_service.create_note(
                recording_id=prepared.recording_id,
                title=llm_result.title,
                note_type=llm_result.note_type,
                markdown=llm_result.markdown,
                model=llm_result.resolved_model,
            )
        else:
            document = self.note_service.update_note(
                document,
                title=llm_result.title,
                markdown=llm_result.markdown,
                model=llm_result.resolved_model,
                status=NoteStatus.READY,
                clear_generation_job_id=True,
            )

        self.job_service.update_job(
            job,
            status=JobStatus.COMPLETED,
            progress=1.0,
            stage="completed",
            result_id=document.id,
        )
        logger.info(
            "AI action job %s completed — document %s (%s)",
            prepared.job_id,
            document.id,
            llm_result.note_type,
        )

    def _mark_failed(
        self,
        job_id: str,
        note_id: str | None,
        exc: Exception,
        *,
        stage: str | None = None,
        unexpected: bool = False,
    ) -> None:
        if isinstance(exc, AppError):
            log_error_guidance(exc.code, exc.message)
            error_message = exc.message
        else:
            if unexpected:
                logger.exception("AI action job %s failed with unexpected error", job_id)
            error_message = str(exc)

        job = self.job_service.get_job(job_id)
        document = self.note_service.get_note(note_id) if note_id else None
        if document is not None:
            self.note_service.update_note(document, status=NoteStatus.FAILED)
        self.job_service.update_job(
            job,
            status=JobStatus.FAILED,
            stage=stage or job.stage,
            error=error_message,
        )
