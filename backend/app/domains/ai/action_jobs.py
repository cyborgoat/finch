from dataclasses import dataclass

from sqlmodel import Session

from app.core.errors import AppError
from app.domains.ai.action_presets import get_preset
from app.domains.ai.action_service import AiActionService
from app.domains.jobs.job_service import JobService
from app.domains.jobs.queue import enqueue_ai_action
from app.domains.recordings.note_service import NoteService
from app.domains.recordings.recording_service import RecordingService
from app.models.job import Job
from app.models.note import Note


@dataclass(frozen=True)
class AiActionJobResult:
    job: Job
    note: Note


class AiActionJobService:
    def __init__(
        self,
        session: Session,
        *,
        recording_service: RecordingService | None = None,
        job_service: JobService | None = None,
        note_service: NoteService | None = None,
        ai_action_service: AiActionService | None = None,
    ) -> None:
        self.session = session
        self.recording_service = recording_service or RecordingService(session)
        self.job_service = job_service or JobService(session)
        self.note_service = note_service or NoteService(session)
        self.ai_action_service = ai_action_service or AiActionService(session)

    def create_job(
        self,
        *,
        recording_id: str,
        action: str,
        source: str,
        model: str | None = None,
    ) -> AiActionJobResult:
        preset = get_preset(action)
        if preset is None:
            raise AppError("AI_ACTION_INVALID", f"Unknown action: {action}.", 400)

        transcript = self.recording_service.get_recording(recording_id)
        job = self.job_service.create_job("ai_action")
        placeholder_title = self.ai_action_service.build_title(preset.title_prefix, transcript)
        resolved_model = model or self.ai_action_service.resolve_default_model()
        note = self.note_service.create_generating_note(
            recording_id=transcript.id,
            title=placeholder_title,
            note_type=preset.note_type,
            generation_job_id=job.id,
            model=resolved_model,
        )
        self.job_service.update_job(job, result_id=note.id)
        enqueue_ai_action(
            job.id,
            recording_id,
            action,
            source,
            model,
            note.id,
        )
        return AiActionJobResult(job=job, note=note)
