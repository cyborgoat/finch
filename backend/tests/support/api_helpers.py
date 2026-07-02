from io import BytesIO
from unittest.mock import patch

from fastapi.testclient import TestClient

from tests.support.fakes import fake_ffmpeg_run


def configure_llm(client: TestClient) -> None:
    client.patch(
        "/api/llm-settings",
        json={
            "provider": "openai",
            "apiKey": "sk-test",
            "defaultModel": "gpt-4.1-mini",
        },
    )


def upload_sample_audio(client: TestClient, sample_wav: bytes) -> str:
    with patch("app.domains.media.audio_service.subprocess.run") as mock_run:
        mock_run.side_effect = fake_ffmpeg_run(sample_wav)
        upload = client.post(
            "/api/audio/upload",
            data={"source": "upload"},
            files={"file": ("sample.wav", BytesIO(sample_wav), "audio/wav")},
        )
    assert upload.status_code == 200
    return upload.json()["id"]


def create_recording(client: TestClient, sample_wav: bytes) -> str:
    audio_id = upload_sample_audio(client, sample_wav)
    with patch("app.domains.media.audio_service.subprocess.run") as mock_run:
        mock_run.side_effect = fake_ffmpeg_run(sample_wav)
        create_response = client.post(
            "/api/recordings",
            json={"audioAssetId": audio_id},
        )
    assert create_response.status_code == 200
    recording_id = create_response.json()["recordingId"]
    transcribe_response = client.post(
        f"/api/recordings/{recording_id}/transcribe",
        json={"language": "auto"},
    )
    assert transcribe_response.status_code == 200
    return recording_id


def create_meeting_summary(client: TestClient, recording_id: str) -> str:
    response = client.post(
        "/api/ai-actions",
        json={
            "recordingId": recording_id,
            "action": "meeting_summary",
            "source": "rawText",
        },
    )
    assert response.status_code == 200
    job_id = response.json()["jobId"]
    job = client.get(f"/api/jobs/{job_id}").json()
    assert job["status"] == "completed"
    return job["resultId"]
