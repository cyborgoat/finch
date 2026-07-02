from io import BytesIO
from unittest.mock import patch

from tests.support.api_helpers import configure_llm
from tests.support.fakes import fake_ffmpeg_run


@patch("app.domains.media.audio_service.subprocess.run")
def test_ai_action_flow(mock_run, client, sample_wav_bytes):
    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    configure_llm(client)

    upload_response = client.post(
        "/api/audio/upload",
        data={"source": "upload"},
        files={"file": ("sample.wav", BytesIO(sample_wav_bytes), "audio/wav")},
    )
    audio_id = upload_response.json()["id"]

    job_response = client.post(
        "/api/recordings",
        json={"audioAssetId": audio_id},
    )
    recording_id = job_response.json()["recordingId"]

    transcribe_response = client.post(
        f"/api/recordings/{recording_id}/transcribe",
        json={"language": "auto"},
    )
    assert transcribe_response.status_code == 200

    ai_job_response = client.post(
        "/api/ai-actions",
        json={
            "recordingId": recording_id,
            "action": "meeting_summary",
            "source": "rawText",
        },
    )
    assert ai_job_response.status_code == 200
    ai_job_id = ai_job_response.json()["jobId"]
    note_id = ai_job_response.json()["noteId"]
    assert note_id

    ai_job = client.get(f"/api/jobs/{ai_job_id}").json()
    assert ai_job["status"] == "completed"
    assert ai_job["resultId"] == note_id

    document = client.get(f"/api/notes/{note_id}").json()
    assert document["type"] == "meeting_summary"
    assert document["status"] == "ready"
    assert document["generationJobId"] is None
    assert "Summary" in document["markdown"]

    patch_response = client.patch(
        f"/api/notes/{note_id}",
        json={"title": "Updated Summary", "markdown": "# Updated"},
    )
    assert patch_response.json()["title"] == "Updated Summary"

    list_response = client.get("/api/notes").json()
    assert len(list_response["items"]) == 1

    delete_response = client.delete(f"/api/notes/{note_id}")
    assert delete_response.status_code == 200
