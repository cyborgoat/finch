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
