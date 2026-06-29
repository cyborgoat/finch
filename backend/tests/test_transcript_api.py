from io import BytesIO
from unittest.mock import patch

import pytest

from app.services.asr_service import AsrResult


@patch("app.services.audio_service.subprocess.run")
def test_transcription_flow(mock_run, client, sample_wav_bytes):
    from pathlib import Path

    def fake_ffmpeg(cmd, check, capture_output):
        output_path = Path(cmd[-1])
        output_path.write_bytes(sample_wav_bytes)
        return type("Result", (), {"returncode": 0})()

    mock_run.side_effect = fake_ffmpeg

    upload_response = client.post(
        "/api/audio/upload",
        data={"source": "upload"},
        files={"file": ("sample.wav", BytesIO(sample_wav_bytes), "audio/wav")},
    )
    assert upload_response.status_code == 200
    audio_id = upload_response.json()["id"]

    with patch(
        "app.workers.transcription_worker.AsrService.transcribe",
        return_value=AsrResult(text="Mock transcript text", language="en"),
    ):
        job_response = client.post(
            "/api/transcripts",
            json={"audioAssetId": audio_id, "language": "auto"},
        )

    assert job_response.status_code == 200
    job_body = job_response.json()
    job_id = job_body["jobId"]
    transcript_id = job_body["transcriptId"]
    assert transcript_id is not None

    job = client.get(f"/api/jobs/{job_id}").json()
    assert job["status"] == "completed"
    assert job["resultId"] is not None

    transcript_response = client.get(f"/api/transcripts/{job['resultId']}")
    assert transcript_response.status_code == 200
    transcript = transcript_response.json()
    assert transcript["rawText"] == "Mock transcript text"
    assert transcript["audioAssetId"] == audio_id

    patch_response = client.patch(
        f"/api/transcripts/{transcript['id']}",
        json={"editedText": "Edited transcript text", "status": "final"},
    )
    assert patch_response.status_code == 200
    patched = patch_response.json()
    assert patched["editedText"] == "Edited transcript text"
    assert patched["status"] == "final"
    assert patched["updatedAt"] is not None

    list_response = client.get("/api/transcripts")
    assert list_response.status_code == 200
    assert len(list_response.json()["items"]) == 1

    delete_response = client.delete(f"/api/transcripts/{transcript['id']}")
    assert delete_response.status_code == 200
    assert delete_response.json()["ok"] is True


@patch("app.api.routes_transcripts.run_transcription_job")
@patch("app.services.audio_service.subprocess.run")
def test_create_transcript_job_adds_transcribing_placeholder(
    mock_run,
    mock_worker,
    client,
    sample_wav_bytes,
):
    from pathlib import Path

    def fake_ffmpeg(cmd, check, capture_output):
        output_path = Path(cmd[-1])
        output_path.write_bytes(sample_wav_bytes)
        return type("Result", (), {"returncode": 0})()

    mock_run.side_effect = fake_ffmpeg

    upload_response = client.post(
        "/api/audio/upload",
        data={"source": "upload"},
        files={"file": ("sample.wav", BytesIO(sample_wav_bytes), "audio/wav")},
    )
    audio_id = upload_response.json()["id"]

    job_response = client.post(
        "/api/transcripts",
        json={"audioAssetId": audio_id, "language": "auto"},
    )
    assert job_response.status_code == 200
    body = job_response.json()
    transcript_id = body["transcriptId"]

    transcript_response = client.get(f"/api/transcripts/{transcript_id}")
    assert transcript_response.status_code == 200
    transcript = transcript_response.json()
    assert transcript["status"] == "transcribing"
    assert transcript["rawText"] == ""

    list_response = client.get("/api/transcripts")
    assert list_response.json()["items"][0]["status"] == "transcribing"


@patch("app.workers.transcription_worker.DiarizationService.load_pipeline")
@patch("app.services.audio_service.subprocess.run")
def test_diarization_fallback_when_hf_token_missing(
    mock_run,
    mock_load_pipeline,
    client,
    sample_wav_bytes,
    monkeypatch: pytest.MonkeyPatch,
):
    from pathlib import Path

    from app.config import get_settings
    from app.core.errors import AppError

    def fake_ffmpeg(cmd, check, capture_output):
        output_path = Path(cmd[-1])
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(sample_wav_bytes)
        return type("Result", (), {"returncode": 0})()

    mock_run.side_effect = fake_ffmpeg
    mock_load_pipeline.side_effect = AppError(
        "DIARIZATION_MODEL_LOAD_FAILED",
        "HF_TOKEN is required for pyannote speaker diarization.",
        500,
    )

    monkeypatch.setenv("DIARIZATION_ENABLED", "true")
    monkeypatch.setenv("DIARIZATION_MOCK", "false")
    get_settings.cache_clear()

    upload_response = client.post(
        "/api/audio/upload",
        data={"source": "upload"},
        files={"file": ("sample.wav", BytesIO(sample_wav_bytes), "audio/wav")},
    )
    audio_id = upload_response.json()["id"]

    job_response = client.post(
        "/api/transcripts",
        json={"audioAssetId": audio_id, "language": "auto"},
    )
    job_id = job_response.json()["jobId"]

    job = client.get(f"/api/jobs/{job_id}").json()
    assert job["status"] == "completed"

    transcript = client.get(f"/api/transcripts/{job['resultId']}").json()
    assert transcript["status"] == "draft"
    assert transcript["rawText"]


@patch("app.services.audio_service.subprocess.run")
def test_diarization_produces_speaker_labeled_transcript(
    mock_run,
    client,
    sample_wav_bytes,
    monkeypatch: pytest.MonkeyPatch,
):
    from pathlib import Path

    from app.config import get_settings

    def fake_ffmpeg(cmd, check, capture_output):
        output_path = Path(cmd[-1])
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(sample_wav_bytes)
        return type("Result", (), {"returncode": 0})()

    mock_run.side_effect = fake_ffmpeg

    monkeypatch.setenv("DIARIZATION_ENABLED", "true")
    monkeypatch.setenv("DIARIZATION_MOCK", "true")
    get_settings.cache_clear()

    upload_response = client.post(
        "/api/audio/upload",
        data={"source": "upload"},
        files={"file": ("sample.wav", BytesIO(sample_wav_bytes), "audio/wav")},
    )
    audio_id = upload_response.json()["id"]

    job_response = client.post(
        "/api/transcripts",
        json={"audioAssetId": audio_id, "language": "auto"},
    )
    assert job_response.status_code == 200
    job_id = job_response.json()["jobId"]

    job = client.get(f"/api/jobs/{job_id}").json()
    assert job["status"] == "completed"

    transcript = client.get(f"/api/transcripts/{job['resultId']}").json()
    assert "Speaker 1:" in transcript["rawText"]
    assert "Speaker 2:" in transcript["rawText"]
    assert transcript["speakerSegments"] is not None
    assert len(transcript["speakerSegments"]) == 2
    assert transcript["speakerSegments"][0]["speaker"] == "Speaker 1"


@patch("app.services.audio_service.subprocess.run")
def test_failed_transcription_keeps_transcript_with_error(
    mock_run,
    client,
    sample_wav_bytes,
):
    from pathlib import Path

    from app.core.errors import AppError

    def fake_ffmpeg(cmd, check, capture_output):
        output_path = Path(cmd[-1])
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(sample_wav_bytes)
        return type("Result", (), {"returncode": 0})()

    mock_run.side_effect = fake_ffmpeg

    upload_response = client.post(
        "/api/audio/upload",
        data={"source": "upload"},
        files={"file": ("sample.wav", BytesIO(sample_wav_bytes), "audio/wav")},
    )
    audio_id = upload_response.json()["id"]

    with patch(
        "app.workers.transcription_worker._transcribe_single_pass",
        side_effect=AppError("ASR_TRANSCRIPTION_FAILED", "Mock ASR failure", 500),
    ):
        job_response = client.post(
            "/api/transcripts",
            json={"audioAssetId": audio_id, "language": "auto"},
        )

    job_id = job_response.json()["jobId"]
    transcript_id = job_response.json()["transcriptId"]

    job = client.get(f"/api/jobs/{job_id}").json()
    assert job["status"] == "failed"
    assert job["error"] == "Mock ASR failure"

    transcript = client.get(f"/api/transcripts/{transcript_id}").json()
    assert transcript["status"] == "failed"
    assert transcript["errorMessage"] == "Mock ASR failure"

    listed = client.get("/api/transcripts").json()["items"]
    assert any(item["id"] == transcript_id and item["status"] == "failed" for item in listed)
