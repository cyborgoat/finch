from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.models.job import Job
from app.schemas.job import JobResponse
from app.services.job_service import JobService
from app.storage.database import get_session

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _to_response(job: Job) -> JobResponse:
    return JobResponse.model_validate(job)


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: str,
    session: Session = Depends(get_session),
) -> JobResponse:
    service = JobService(session)
    return _to_response(service.get_job(job_id))
