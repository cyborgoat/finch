from io import BytesIO
from unittest.mock import patch

from tests.support.fakes import fake_ffmpeg_run


@patch("app.services.audio_service.subprocess.run")
def test_ai_action_flow(mock_run, client, sample_wav_bytes):
    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    client.patch(
        "/api/llm-settings",
        json={
            "provider": "openai",
            "apiKey": "sk-test",
            "defaultModel": "gpt-4.1-mini",
        },
    )

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
    transcript_id = job_response.json()["transcriptId"]

    ai_job_response = client.post(
        "/api/ai-actions",
        json={
            "transcriptId": transcript_id,
            "action": "markdown_summary",
            "source": "rawText",
        },
    )
    assert ai_job_response.status_code == 200
    ai_job_id = ai_job_response.json()["jobId"]

    ai_job = client.get(f"/api/jobs/{ai_job_id}").json()
    assert ai_job["status"] == "completed"
    document_id = ai_job["resultId"]

    document = client.get(f"/api/documents/{document_id}").json()
    assert document["type"] == "markdown_summary"
    assert "Summary" in document["markdown"]

    patch_response = client.patch(
        f"/api/documents/{document_id}",
        json={"title": "Updated Summary", "markdown": "# Updated"},
    )
    assert patch_response.json()["title"] == "Updated Summary"

    list_response = client.get("/api/documents").json()
    assert len(list_response["items"]) == 1

    delete_response = client.delete(f"/api/documents/{document_id}")
    assert delete_response.status_code == 200
