from datetime import UTC, datetime

from sqlmodel import Session

from app.core.enums import JobStatus
from app.core.errors import AppError
from app.core.ids import generate_job_id
from app.models.job import Job


class JobService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create_job(self, job_type: str) -> Job:
        job = Job(
            id=generate_job_id(),
            type=job_type,
            status=JobStatus.QUEUED,
            progress=0.0,
            stage="queued",
        )
        self.session.add(job)
        self.session.commit()
        self.session.refresh(job)
        return job

    def get_job(self, job_id: str) -> Job:
        job = self.session.get(Job, job_id)
        if job is None:
            raise AppError("JOB_NOT_FOUND", "Job not found.", 404)
        return job

    def update_job(
        self,
        job: Job,
        *,
        status: str | None = None,
        progress: float | None = None,
        stage: str | None = None,
        result_id: str | None = None,
        error: str | None = None,
    ) -> Job:
        if status is not None:
            job.status = status
        if progress is not None:
            job.progress = progress
        if stage is not None:
            job.stage = stage
        if result_id is not None:
            job.result_id = result_id
        if error is not None:
            job.error = error
        job.updated_at = datetime.now(UTC)
        self.session.add(job)
        self.session.commit()
        self.session.refresh(job)
        return job
