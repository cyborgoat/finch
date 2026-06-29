from sqlmodel import Session

from app.config import get_settings
from app.core.errors import AppError
from app.services.asr_service import AsrService
from app.services.audio_service import AudioService
from app.services.job_service import JobService
from app.services.transcript_service import TranscriptService
from app.storage.database import get_engine


def run_transcription_job(job_id: str, audio_asset_id: str, language: str = "auto") -> None:
    settings = get_settings()

    with Session(get_engine()) as session:
        job_service = JobService(session, settings)
        audio_service = AudioService(session, settings)
        transcript_service = TranscriptService(session, settings)
        asr_service = AsrService(settings)

        job = job_service.get_job(job_id)

        try:
            job_service.update_job(job, status="processing", progress=0.1, stage="loading_model")
            asr_service.load_model()

            audio_asset = audio_service.get_audio(audio_asset_id)
            if not audio_asset.normalized_path:
                raise AppError(
                    "AUDIO_NORMALIZATION_FAILED",
                    "Normalized audio is not available.",
                    500,
                )

            job_service.update_job(job, progress=0.4, stage="running_asr")

            def on_chunk(
                chunk_index: int,
                total_chunks: int,
                _start_sec: float,
                _end_sec: float,
                _text: str,
                _language: str | None,
            ) -> None:
                progress = 0.4 + (0.4 * chunk_index / total_chunks)
                job_service.update_job(
                    job,
                    progress=progress,
                    stage=f"running_asr_chunk_{chunk_index}_of_{total_chunks}",
                )

            result = asr_service.transcribe(
                audio_asset.normalized_path,
                language=language,
                on_chunk=on_chunk,
            )

            job_service.update_job(job, progress=0.8, stage="saving_transcript")
            title = audio_asset.filename.rsplit(".", 1)[0] or "Untitled Transcript"
            transcript = transcript_service.create_transcript(
                audio_asset_id=audio_asset.id,
                title=title,
                raw_text=result.text,
                language=result.language,
            )

            job_service.update_job(
                job,
                status="completed",
                progress=1.0,
                stage="completed",
                result_id=transcript.id,
            )
        except AppError as exc:
            job_service.update_job(
                job,
                status="failed",
                stage=job.stage,
                error=exc.message,
            )
        except Exception as exc:
            job_service.update_job(
                job,
                status="failed",
                stage=job.stage,
                error=str(exc),
            )
