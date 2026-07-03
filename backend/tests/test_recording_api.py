import re
from pathlib import Path
from unittest.mock import patch

import pytest

from tests.support.api_helpers import (
    create_pending_recording,
    start_recording_transcription,
    upload_audio,
)
from tests.support.fakes import FAKE_TRANSCRIPT_TEXT, fake_diarization_turns, fake_ffmpeg_run

RECORDING_TITLE_PATTERN = re.compile(
    r"^Recording \d{4}-\d{2}-\d{2} \d{2}:\d{2}( \(\d+\))?$"
)


@patch("app.domains.media.audio_service.subprocess.run")
def test_transcription_flow(mock_run, client, sample_wav_bytes):
    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    upload_response = upload_audio(client, sample_wav_bytes)
    assert upload_response.status_code == 200
    audio_id = upload_response.json()["id"]

    create_response = create_pending_recording(client, audio_id)
    assert create_response.status_code == 200
    recording_id = create_response.json()["recordingId"]

    job_response = start_recording_transcription(client, recording_id)
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

    audio_id = upload_audio(client, sample_wav_bytes).json()["id"]
    create_response = create_pending_recording(client, audio_id)
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
def teststart_recording_transcription_sets_transcribing_status(
    mock_run,
    mock_worker,
    client,
    sample_wav_bytes,
):
    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    audio_id = upload_audio(client, sample_wav_bytes).json()["id"]
    recording_id = create_pending_recording(client, audio_id).json()["recordingId"]

    transcribe_response = start_recording_transcription(client, recording_id)
    assert transcribe_response.status_code == 200
    assert transcribe_response.json()["recordingId"] == recording_id

    recording = client.get(f"/api/recordings/{recording_id}").json()
    assert recording["status"] == "transcribing"


@patch("app.domains.jobs.transcription_jobs.enqueue_transcription")
@patch("app.domains.media.audio_service.subprocess.run")
def test_transcribing_recording_includes_active_job_id(
    mock_run,
    mock_worker,
    client,
    sample_wav_bytes,
):
    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    audio_id = upload_audio(client, sample_wav_bytes).json()["id"]
    recording_id = create_pending_recording(client, audio_id).json()["recordingId"]

    transcribe_response = start_recording_transcription(client, recording_id)
    assert transcribe_response.status_code == 200
    job_id = transcribe_response.json()["jobId"]

    recording = client.get(f"/api/recordings/{recording_id}").json()
    assert recording["status"] == "transcribing"
    assert recording["transcriptionJobId"] == job_id


@patch("app.domains.jobs.transcription_jobs.enqueue_transcription")
@patch("app.domains.media.audio_service.subprocess.run")
def test_create_recording_uses_datetime_title_for_mic_recordings(
    mock_run,
    mock_worker,
    client,
    sample_wav_bytes,
):
    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    audio_id = upload_audio(
        client,
        sample_wav_bytes,
        source="recording",
        filename="recording.webm",
    ).json()["id"]
    recording_id = create_pending_recording(client, audio_id).json()["recordingId"]
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
        audio_id = upload_audio(
            client,
            sample_wav_bytes,
            source="recording",
            filename=f"recording-{index}.webm",
        ).json()["id"]
        recording_id = create_pending_recording(client, audio_id).json()["recordingId"]
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

    audio_id = upload_audio(client, sample_wav_bytes).json()["id"]
    recording_id = create_pending_recording(client, audio_id).json()["recordingId"]
    start_recording_transcription(client, recording_id)

    recording = client.get(f"/api/recordings/{recording_id}").json()
    assert recording["rawText"] == FAKE_TRANSCRIPT_TEXT

    client.patch(
        f"/api/recordings/{recording_id}",
        json={"editedText": "User edits"},
    )

    start_recording_transcription(client, recording_id, regenerate=True)
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

    audio_id = upload_audio(client, sample_wav_bytes).json()["id"]
    recording_id = create_pending_recording(client, audio_id).json()["recordingId"]
    job_id = start_recording_transcription(client, recording_id).json()["jobId"]

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

    audio_id = upload_audio(client, sample_wav_bytes).json()["id"]
    recording_id = create_pending_recording(client, audio_id).json()["recordingId"]
    job_id = start_recording_transcription(client, recording_id).json()["jobId"]

    job = client.get(f"/api/jobs/{job_id}").json()
    assert job["status"] == "completed"

    transcript = client.get(f"/api/recordings/{job['resultId']}").json()
    assert "Speaker 1:" in transcript["rawText"]
    assert "Speaker 2:" in transcript["rawText"]
    assert transcript["speakerSegments"] is not None
    assert len(transcript["speakerSegments"]) == 2
    assert transcript["speakerSegments"][0]["speaker"] == "Speaker 1"


@patch("app.domains.transcription.pipeline.AudioPurificationService.prepare_for_diarization")
@patch("app.domains.transcription.pipeline.DiarizationService.load_pipeline")
@patch("app.domains.transcription.pipeline.DiarizationService.diarize")
@patch("app.domains.transcription.pipeline.extract_audio_slice")
@patch("app.domains.media.audio_service.subprocess.run")
def test_diarization_with_purification_remaps_timestamps(
    mock_run,
    mock_extract_slice,
    mock_diarize,
    mock_load_pipeline,
    mock_prepare,
    client,
    sample_wav_bytes,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
):
    from app.config import get_settings
    from app.domains.transcription.audio_purification_service import (
        PurifiedAudio,
        build_time_map,
    )
    from app.domains.transcription.types import DiarizationTurn

    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)
    mock_extract_slice.return_value = str(tmp_path / "slice.wav")

    time_map = build_time_map([(100.0, 105.0), (200.0, 205.0)])
    purified_path = tmp_path / "purified.wav"
    purified_path.write_bytes(sample_wav_bytes)
    mock_prepare.return_value = PurifiedAudio(
        path=str(purified_path),
        duration_sec=10.0,
        time_map=time_map,
        temp_dir=tmp_path,
        original_duration_sec=300.0,
    )
    mock_diarize.return_value = [
        DiarizationTurn("Speaker 1", 0.0, 5.0, cluster_id="SPEAKER_00"),
        DiarizationTurn("Speaker 2", 5.0, 10.0, cluster_id="SPEAKER_01"),
    ]

    monkeypatch.setenv("DIARIZATION_ENABLED", "true")
    monkeypatch.setenv("AUDIO_PURIFICATION_ENABLED", "true")
    get_settings.cache_clear()

    audio_id = upload_audio(client, sample_wav_bytes).json()["id"]
    recording_id = create_pending_recording(client, audio_id).json()["recordingId"]
    job_id = start_recording_transcription(client, recording_id).json()["jobId"]

    job = client.get(f"/api/jobs/{job_id}").json()
    assert job["status"] == "completed"

    mock_diarize.assert_called_once()
    assert mock_diarize.call_args.args[0] == str(purified_path)

    assert mock_extract_slice.call_count == 2
    first_call = mock_extract_slice.call_args_list[0]
    assert first_call.args[1] == pytest.approx(100.0)
    assert first_call.args[2] == pytest.approx(105.0)
    second_call = mock_extract_slice.call_args_list[1]
    assert second_call.args[1] == pytest.approx(200.0)
    assert second_call.args[2] == pytest.approx(205.0)

    transcript = client.get(f"/api/recordings/{job['resultId']}").json()
    assert transcript["speakerSegments"][0]["startSec"] == pytest.approx(100.0)
    assert transcript["speakerSegments"][1]["startSec"] == pytest.approx(200.0)


@patch("app.domains.media.audio_service.subprocess.run")
def test_failed_transcription_keeps_recording_with_error(
    mock_run,
    client,
    sample_wav_bytes,
):
    from app.core.errors import AppError

    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    audio_id = upload_audio(client, sample_wav_bytes).json()["id"]
    recording_id = create_pending_recording(client, audio_id).json()["recordingId"]

    with patch(
        "app.domains.transcription.pipeline.TranscriptionPipeline._transcribe_single_pass",
        side_effect=AppError("ASR_TRANSCRIPTION_FAILED", "Mock ASR failure", 500),
    ):
        job_response = start_recording_transcription(client, recording_id)

    job_id = job_response.json()["jobId"]

    job = client.get(f"/api/jobs/{job_id}").json()
    assert job["status"] == "failed"
    assert job["error"] == "Mock ASR failure"

    transcript = client.get(f"/api/recordings/{recording_id}").json()
    assert transcript["status"] == "failed"
    assert transcript["errorMessage"] == "Mock ASR failure"

    listed = client.get("/api/recordings").json()["items"]
    assert any(item["id"] == recording_id and item["status"] == "failed" for item in listed)
