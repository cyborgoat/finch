from io import BytesIO
import re
from unittest.mock import patch

import pytest

from tests.support.fakes import FAKE_TRANSCRIPT_TEXT, fake_diarization_turns, fake_ffmpeg_run

RECORDING_TITLE_PATTERN = re.compile(
    r"^Recording \d{4}-\d{2}-\d{2} \d{2}:\d{2}( \(\d+\))?$"
)


def _upload_audio(client, sample_wav_bytes, *, source="upload", filename="sample.wav"):
    return client.post(
        "/api/audio/upload",
        data={"source": source},
        files={"file": (filename, BytesIO(sample_wav_bytes), "audio/wav")},
    )


def _create_pending(client, audio_id):
    return client.post("/api/recordings", json={"audioAssetId": audio_id})


def _start_transcription(client, recording_id, **payload):
    return client.post(
        f"/api/recordings/{recording_id}/transcribe",
        json={"language": "auto", **payload},
    )


@patch("app.domains.media.audio_service.subprocess.run")
def test_transcription_flow(mock_run, client, sample_wav_bytes):
    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    upload_response = _upload_audio(client, sample_wav_bytes)
    assert upload_response.status_code == 200
    audio_id = upload_response.json()["id"]

    create_response = _create_pending(client, audio_id)
    assert create_response.status_code == 200
    recording_id = create_response.json()["recordingId"]

    job_response = _start_transcription(client, recording_id)
    assert job_response.status_code == 200
    job_id = job_response.json()["jobId"]

    job = client.get(f"/api/jobs/{job_id}").json()
    assert job["status"] == "completed"
    assert job["resultId"] is not None

    recording_response = client.get(f"/api/recordings/{job['resultId']}")
    assert recording_response.status_code == 200
    transcript = recording_response.json()
    assert transcript["rawText"] == FAKE_TRANSCRIPT_TEXT
    assert transcript["audioAssetId"] == audio_id

    patch_response = client.patch(
        f"/api/recordings/{transcript['id']}",
        json={"editedText": "Edited transcript text"},
    )
    assert patch_response.status_code == 200
    patched = patch_response.json()
    assert patched["editedText"] == "Edited transcript text"
    assert patched["status"] == "draft"
    assert patched["updatedAt"] is not None

    list_response = client.get("/api/recordings")
    assert list_response.status_code == 200
    assert len(list_response.json()["items"]) == 1

    delete_response = client.delete(f"/api/recordings/{transcript['id']}")
    assert delete_response.status_code == 200
    assert delete_response.json()["ok"] is True


@patch("app.domains.jobs.transcription_jobs.enqueue_transcription")
@patch("app.domains.media.audio_service.subprocess.run")
def test_create_recording_returns_pending(
    mock_run,
    mock_worker,
    client,
    sample_wav_bytes,
):
    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    audio_id = _upload_audio(client, sample_wav_bytes).json()["id"]
    create_response = _create_pending(client, audio_id)
    assert create_response.status_code == 200
    body = create_response.json()
    assert body["status"] == "pending"
    recording_id = body["recordingId"]

    recording = client.get(f"/api/recordings/{recording_id}").json()
    assert recording["status"] == "pending"
    assert recording["rawText"] == ""
    assert recording["title"] == "sample"


@patch("app.domains.jobs.transcription_jobs.enqueue_transcription")
@patch("app.domains.media.audio_service.subprocess.run")
def test_start_transcription_sets_transcribing_status(
    mock_run,
    mock_worker,
    client,
    sample_wav_bytes,
):
    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    audio_id = _upload_audio(client, sample_wav_bytes).json()["id"]
    recording_id = _create_pending(client, audio_id).json()["recordingId"]

    transcribe_response = _start_transcription(client, recording_id)
    assert transcribe_response.status_code == 200
    assert transcribe_response.json()["recordingId"] == recording_id

    recording = client.get(f"/api/recordings/{recording_id}").json()
    assert recording["status"] == "transcribing"


@patch("app.domains.jobs.transcription_jobs.enqueue_transcription")
@patch("app.domains.media.audio_service.subprocess.run")
def test_create_recording_uses_datetime_title_for_mic_recordings(
    mock_run,
    mock_worker,
    client,
    sample_wav_bytes,
):
    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    audio_id = _upload_audio(
        client,
        sample_wav_bytes,
        source="recording",
        filename="recording.webm",
    ).json()["id"]
    recording_id = _create_pending(client, audio_id).json()["recordingId"]
    recording = client.get(f"/api/recordings/{recording_id}").json()

    assert RECORDING_TITLE_PATTERN.match(recording["title"])


@patch("app.domains.jobs.transcription_jobs.enqueue_transcription")
@patch("app.domains.media.audio_service.subprocess.run")
def test_create_recording_uses_unique_titles_for_same_minute(
    mock_run,
    mock_worker,
    client,
    sample_wav_bytes,
):
    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    titles: list[str] = []
    for index in range(2):
        audio_id = _upload_audio(
            client,
            sample_wav_bytes,
            source="recording",
            filename=f"recording-{index}.webm",
        ).json()["id"]
        recording_id = _create_pending(client, audio_id).json()["recordingId"]
        recording = client.get(f"/api/recordings/{recording_id}").json()
        titles.append(recording["title"])

    assert titles[0] != titles[1]
    assert all(RECORDING_TITLE_PATTERN.match(title) for title in titles)


@patch("app.domains.media.audio_service.subprocess.run")
def test_regenerate_transcription_clears_existing_text(
    mock_run,
    client,
    sample_wav_bytes,
):
    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    audio_id = _upload_audio(client, sample_wav_bytes).json()["id"]
    recording_id = _create_pending(client, audio_id).json()["recordingId"]
    _start_transcription(client, recording_id)

    recording = client.get(f"/api/recordings/{recording_id}").json()
    assert recording["rawText"] == FAKE_TRANSCRIPT_TEXT

    client.patch(
        f"/api/recordings/{recording_id}",
        json={"editedText": "User edits"},
    )

    _start_transcription(client, recording_id, regenerate=True)
    recording = client.get(f"/api/recordings/{recording_id}").json()
    assert recording["status"] == "draft"
    assert recording["editedText"] == ""
    assert recording["rawText"] == FAKE_TRANSCRIPT_TEXT


@patch("app.domains.transcription.pipeline.DiarizationService.load_pipeline")
@patch("app.domains.media.audio_service.subprocess.run")
def test_diarization_fallback_when_hf_token_missing(
    mock_run,
    mock_load_pipeline,
    client,
    sample_wav_bytes,
    monkeypatch: pytest.MonkeyPatch,
):
    from app.config import get_settings
    from app.core.errors import AppError

    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)
    mock_load_pipeline.side_effect = AppError(
        "DIARIZATION_MODEL_LOAD_FAILED",
        "HF_TOKEN is required for pyannote speaker diarization.",
        500,
    )

    monkeypatch.setenv("DIARIZATION_ENABLED", "true")
    get_settings.cache_clear()

    audio_id = _upload_audio(client, sample_wav_bytes).json()["id"]
    recording_id = _create_pending(client, audio_id).json()["recordingId"]
    job_id = _start_transcription(client, recording_id).json()["jobId"]

    job = client.get(f"/api/jobs/{job_id}").json()
    assert job["status"] == "completed"

    transcript = client.get(f"/api/recordings/{job['resultId']}").json()
    assert transcript["status"] == "draft"
    assert transcript["rawText"]


@patch("app.domains.transcription.pipeline.DiarizationService.load_pipeline")
@patch("app.domains.transcription.pipeline.DiarizationService.diarize")
@patch("app.domains.media.audio_service.subprocess.run")
def test_diarization_produces_speaker_labeled_transcript(
    mock_run,
    mock_diarize,
    mock_load_pipeline,
    client,
    sample_wav_bytes,
    monkeypatch: pytest.MonkeyPatch,
):
    from app.config import get_settings

    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)
    mock_diarize.return_value = fake_diarization_turns()

    monkeypatch.setenv("DIARIZATION_ENABLED", "true")
    get_settings.cache_clear()

    audio_id = _upload_audio(client, sample_wav_bytes).json()["id"]
    recording_id = _create_pending(client, audio_id).json()["recordingId"]
    job_id = _start_transcription(client, recording_id).json()["jobId"]

    job = client.get(f"/api/jobs/{job_id}").json()
    assert job["status"] == "completed"

    transcript = client.get(f"/api/recordings/{job['resultId']}").json()
    assert "Speaker 1:" in transcript["rawText"]
    assert "Speaker 2:" in transcript["rawText"]
    assert transcript["speakerSegments"] is not None
    assert len(transcript["speakerSegments"]) == 2
    assert transcript["speakerSegments"][0]["speaker"] == "Speaker 1"


@patch("app.domains.media.audio_service.subprocess.run")
def test_failed_transcription_keeps_recording_with_error(
    mock_run,
    client,
    sample_wav_bytes,
):
    from app.core.errors import AppError

    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    audio_id = _upload_audio(client, sample_wav_bytes).json()["id"]
    recording_id = _create_pending(client, audio_id).json()["recordingId"]

    with patch(
        "app.domains.transcription.pipeline.TranscriptionPipeline._transcribe_single_pass",
        side_effect=AppError("ASR_TRANSCRIPTION_FAILED", "Mock ASR failure", 500),
    ):
        job_response = _start_transcription(client, recording_id)

    job_id = job_response.json()["jobId"]

    job = client.get(f"/api/jobs/{job_id}").json()
    assert job["status"] == "failed"
    assert job["error"] == "Mock ASR failure"

    transcript = client.get(f"/api/recordings/{recording_id}").json()
    assert transcript["status"] == "failed"
    assert transcript["errorMessage"] == "Mock ASR failure"

    listed = client.get("/api/recordings").json()["items"]
    assert any(item["id"] == recording_id and item["status"] == "failed" for item in listed)
