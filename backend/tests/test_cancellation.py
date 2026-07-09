
import threading
from unittest.mock import patch

import pytest

from tests.support.api_helpers import (
    create_pending_recording,
    start_recording_transcription,
    upload_audio,
)
from tests.support.fakes import fake_ffmpeg_run
from app.workers.cancellation import (
    JobCancelledError,
    check_cancelled,
    install_shutdown_handlers,
    is_shutdown_requested,
    reset_cancellation_state,
)


def test_check_cancelled_raises_when_shutdown_requested():
    install_shutdown_handlers()
    reset_cancellation_state()
    import app.workers.cancellation as cancellation

    cancellation._shutdown_requested = True
    try:
        with pytest.raises(JobCancelledError):
            check_cancelled()
    finally:
        reset_cancellation_state()


def test_check_cancelled_noop_when_not_shutdown():
    reset_cancellation_state()
    check_cancelled()
    assert is_shutdown_requested() is False


def test_install_shutdown_handlers_noop_on_worker_thread():
    reset_cancellation_state()
    import app.workers.cancellation as cancellation

    cancellation._handlers_installed = False
    thread = threading.Thread(target=install_shutdown_handlers)
    thread.start()
    thread.join()
    assert cancellation._handlers_installed is False


def test_transcription_job_fails_when_cancelled(client, sample_wav_bytes, monkeypatch):
    from app.workers.cancellation import JobCancelledError

    monkeypatch.setenv("DIARIZATION_ENABLED", "false")
    from app.config import get_settings

    get_settings.cache_clear()

    with patch("app.domains.media.subprocess_utils.subprocess.run") as mock_run:
        mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)
        audio_id = upload_audio(client, sample_wav_bytes).json()["id"]
        recording_id = create_pending_recording(client, audio_id).json()["recordingId"]

        with patch(
            "app.domains.transcription.pipeline.check_cancelled",
            side_effect=JobCancelledError("Transcription cancelled during worker shutdown."),
        ):
            job_id = start_recording_transcription(client, recording_id).json()["jobId"]

    job = client.get(f"/api/jobs/{job_id}").json()
    assert job["status"] == "failed"
    assert "cancelled" in job["error"].lower()
