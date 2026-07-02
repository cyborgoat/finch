from sqlmodel import Session

from app.config import get_settings
from app.domains.ai.pipeline import AiActionPipeline
from app.storage.database import get_engine


def run_ai_action_job(
    job_id: str,
    recording_id: str,
    action: str,
    source: str,
    model: str | None = None,
    note_id: str | None = None,
) -> None:
    with Session(get_engine()) as session:
        AiActionPipeline(session, get_settings()).run(
            job_id,
            recording_id,
            action,
            source,
            model,
            note_id,
        )
