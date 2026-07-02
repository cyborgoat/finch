import logging
import os
import sys

from huey import SqliteHuey

from app.config import get_settings

logger = logging.getLogger(__name__)

_huey: SqliteHuey | None = None
run_transcription_task = None
run_ai_action_task = None


def _immediate_mode() -> bool:
    if "pytest" in sys.modules:
        return True
    return os.getenv("HUEY_IMMEDIATE", "").lower() in {"1", "true", "yes"}


def _create_huey() -> SqliteHuey:
    settings = get_settings()
    return SqliteHuey(
        "finch-jobs",
        filename=settings.resolve_huey_db_path(),
        immediate=_immediate_mode(),
    )


def _register_tasks(h: SqliteHuey) -> None:
    @h.task(retries=2, retry_delay=5)
    def run_transcription_task(
        job_id: str,
        audio_asset_id: str,
        language: str = "auto",
    ) -> None:
        from app.workers.transcription_worker import run_transcription_job

        run_transcription_job(job_id, audio_asset_id, language)

    @h.task(retries=2, retry_delay=5)
    def run_ai_action_task(
        job_id: str,
        recording_id: str,
        action: str,
        source: str,
        model: str | None = None,
        note_id: str | None = None,
    ) -> None:
        from app.workers.ai_action_worker import run_ai_action_job

        run_ai_action_job(job_id, recording_id, action, source, model, note_id)

    globals()["run_transcription_task"] = run_transcription_task
    globals()["run_ai_action_task"] = run_ai_action_task


def get_huey() -> SqliteHuey:
    global _huey
    if _huey is None:
        _huey = _create_huey()
        _register_tasks(_huey)
    return _huey


def reset_huey() -> SqliteHuey:
    """Recreate the Huey instance (used by tests after env overrides)."""
    global _huey, huey
    _huey = None
    huey = get_huey()
    return huey


def enqueue_transcription(job_id: str, audio_asset_id: str, language: str = "auto"):
    return run_transcription_task(job_id, audio_asset_id, language)


def enqueue_ai_action(
    job_id: str,
    recording_id: str,
    action: str,
    source: str,
    model: str | None = None,
    note_id: str | None = None,
):
    return run_ai_action_task(job_id, recording_id, action, source, model, note_id)


def recover_orphaned_jobs() -> None:
    from sqlmodel import Session, select

    from app.core.enums import JobStatus, NoteStatus
    from app.domains.jobs.job_service import JobService
    from app.domains.recordings.recording_service import RecordingService
    from app.models.job import Job
    from app.models.note import Note
    from app.storage.database import get_engine

    with Session(get_engine()) as session:
        job_service = JobService(session)
        orphaned = session.exec(
            select(Job).where(Job.status == JobStatus.PROCESSING)
        ).all()
        for job in orphaned:
            if job.type == "transcription" and job.result_id:
                logger.warning("Re-enqueueing orphaned transcription job %s", job.id)
                recording = RecordingService(session).get_recording(job.result_id)
                job_service.update_job(job, status=JobStatus.QUEUED, stage="queued")
                enqueue_transcription(
                    job.id,
                    recording.audio_asset_id,
                    recording.language or "auto",
                )
                continue

            logger.warning("Marking orphaned job %s as failed", job.id)
            job_service.update_job(
                job,
                status=JobStatus.FAILED,
                error="Worker interrupted before completion. Please retry.",
            )
            if job.type == "ai_action" and job.result_id:
                note = session.get(Note, job.result_id)
                if note is not None:
                    note.status = NoteStatus.FAILED
                    session.add(note)
        session.commit()


# Huey consumer entrypoint: `huey_consumer app.domains.jobs.queue.huey`
huey = get_huey()
