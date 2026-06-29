from io import BytesIO
from unittest.mock import patch

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
