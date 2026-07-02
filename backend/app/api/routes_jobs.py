from fastapi import APIRouter, Depends

from app.api.deps import get_job_service
from app.domains.jobs.job_service import JobService
from app.models.job import Job
from app.schemas.job import JobResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _to_response(job: Job) -> JobResponse:
    return JobResponse.model_validate(job)


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: str,
    service: JobService = Depends(get_job_service),
) -> JobResponse:
    return _to_response(service.get_job(job_id))
