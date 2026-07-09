from sqlmodel import Session

from app.config import get_settings
from app.domains.transcription.pipeline import TranscriptionPipeline
from app.storage.database import get_engine
from app.workers.cancellation import install_shutdown_handlers, reset_cancellation_state


def run_transcription_job(job_id: str, audio_asset_id: str, language: str = "auto") -> None:
    install_shutdown_handlers()
    reset_cancellation_state()
    try:
        with Session(get_engine()) as session:
            TranscriptionPipeline(session, get_settings()).run(job_id, audio_asset_id, language)
    finally:
        reset_cancellation_state()
