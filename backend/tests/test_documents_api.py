from io import BytesIO
from unittest.mock import patch

from tests.support.fakes import fake_ffmpeg_run


def _create_transcript(client, sample_wav: bytes) -> str:
    with patch("app.services.audio_service.subprocess.run") as mock_run:
        mock_run.side_effect = fake_ffmpeg_run(sample_wav)
        upload = client.post(
            "/api/audio/upload",
            data={"source": "upload"},
            files={"file": ("sample.wav", BytesIO(sample_wav), "audio/wav")},
        )
    audio_id = upload.json()["id"]

    with patch("app.services.audio_service.subprocess.run") as mock_run:
        mock_run.side_effect = fake_ffmpeg_run(sample_wav)
        job = client.post(
            "/api/transcripts",
            json={"audioAssetId": audio_id, "language": "auto"},
        )
    return job.json()["transcriptId"]


def _create_summary(client, transcript_id: str) -> str:
    response = client.post(
        "/api/ai-actions",
        json={
            "transcriptId": transcript_id,
            "action": "markdown_summary",
            "source": "rawText",
        },
    )
    assert response.status_code == 200
    job_id = response.json()["jobId"]
    job = client.get(f"/api/jobs/{job_id}").json()
    assert job["status"] == "completed"
    return job["resultId"]


def test_list_documents_filters_by_transcript_id(client, sample_wav_bytes):
    client.patch(
        "/api/llm-settings",
        json={
            "provider": "openai",
            "apiKey": "sk-test",
            "defaultModel": "gpt-4.1-mini",
        },
    )

    transcript_a = _create_transcript(client, sample_wav_bytes)
    transcript_b = _create_transcript(client, sample_wav_bytes)

    doc_a = _create_summary(client, transcript_a)
    doc_b = _create_summary(client, transcript_b)
    assert doc_a != doc_b

    filtered_a = client.get(f"/api/documents?transcriptId={transcript_a}").json()
    assert len(filtered_a["items"]) == 1
    assert filtered_a["items"][0]["id"] == doc_a
    assert filtered_a["items"][0]["transcriptId"] == transcript_a

    filtered_b = client.get(f"/api/documents?transcriptId={transcript_b}").json()
    assert len(filtered_b["items"]) == 1
    assert filtered_b["items"][0]["id"] == doc_b
    assert filtered_b["items"][0]["transcriptId"] == transcript_b

    all_docs = client.get("/api/documents").json()
    assert len(all_docs["items"]) == 2


def test_create_manual_note_and_delete_one_of_many(client, sample_wav_bytes):
    transcript_id = _create_transcript(client, sample_wav_bytes)

    create_a = client.post(
        "/api/documents",
        json={"transcriptId": transcript_id, "title": "My note", "markdown": "# Hello"},
    )
    assert create_a.status_code == 200
    doc_a = create_a.json()["id"]
    assert create_a.json()["type"] == "note"
    assert create_a.json()["model"] == "manual"

    create_b = client.post(
        "/api/documents",
        json={"transcriptId": transcript_id},
    )
    assert create_b.status_code == 200
    doc_b = create_b.json()["id"]
    assert doc_b != doc_a

    listed = client.get(f"/api/documents?transcriptId={transcript_id}").json()
    assert len(listed["items"]) == 2

    delete_response = client.delete(f"/api/documents/{doc_a}")
    assert delete_response.status_code == 200

    remaining = client.get(f"/api/documents?transcriptId={transcript_id}").json()
    assert len(remaining["items"]) == 1
    assert remaining["items"][0]["id"] == doc_b


def test_list_ai_action_templates(client):
    response = client.get("/api/ai-actions/templates")
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 4
    ids = {item["id"] for item in items}
    assert ids == {"meeting_summary", "action_items", "key_decisions", "follow_up_email"}
