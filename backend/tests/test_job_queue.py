from datetime import UTC, datetime
from unittest.mock import patch

from app.core.enums import JobStatus
from app.domains.jobs.job_service import JobService
from app.domains.jobs.queue import enqueue_transcription, huey, recover_orphaned_jobs
from app.models.audio_asset import AudioAsset


def test_huey_registers_tasks_at_import():
    assert "app.domains.jobs.queue.run_transcription_task" in huey._registry._registry
    assert "app.domains.jobs.queue.run_ai_action_task" in huey._registry._registry


def test_enqueue_transcription_runs_in_immediate_mode(db_session):
    import app.domains.jobs.queue as job_queue

    job_queue.reset_huey()

    job = JobService(db_session).create_job("transcription")
    with patch("app.workers.transcription_worker.run_transcription_job") as mock_run:
        enqueue_transcription(job.id, "audio_test1234567890", "auto")
        mock_run.assert_called_once_with(job.id, "audio_test1234567890", "auto")


def test_recover_orphaned_jobs_requeues_transcription(db_session):
    now = datetime.now(UTC)
    asset = AudioAsset(
        id="audio_test1234567890",
        source="upload",
        filename="sample.wav",
        mime_type="audio/wav",
        size_bytes=100,
        original_path="/tmp/sample.wav",
        normalized_path="/tmp/sample-normalized.wav",
        created_at=now,
    )
    db_session.add(asset)
    db_session.commit()

    from app.domains.recordings.recording_service import RecordingService

    recording = RecordingService(db_session).create_recording(
        audio_asset_id=asset.id,
        title="Sample",
        raw_text="",
        status="transcribing",
    )

    job_service = JobService(db_session)
    job = job_service.create_job("transcription")
    job_service.update_job(
        job,
        status=JobStatus.PROCESSING,
        stage="running_asr",
        result_id=recording.id,
    )

    with patch("app.domains.jobs.queue.enqueue_transcription") as mock_enqueue:
        recover_orphaned_jobs()
        mock_enqueue.assert_called_once_with(job.id, asset.id, "auto")

    db_session.expire_all()
    updated = job_service.get_job(job.id)
    assert updated.status == JobStatus.QUEUED
