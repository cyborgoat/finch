from io import BytesIO
from pathlib import Path
from unittest.mock import patch

import pytest

from tests.support.api_helpers import create_pending_recording, upload_audio
from tests.support.fakes import fake_ffmpeg_run


def _edit_source(client, recording_id: str, **payload):
    return client.post(
        f"/api/recordings/{recording_id}/edit-source",
        json={
            "trimStartSec": 0.0,
            "removeSilence": False,
            "mode": "replace",
            **payload,
        },
    )


@patch("app.domains.media.audio_edit_service.subprocess.run")
@patch("app.domains.media.audio_service.subprocess.run")
def test_edit_source_trim_replace(
    mock_audio_run,
    mock_edit_run,
    client,
    sample_wav_bytes,
):
    mock_audio_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)
    mock_edit_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    audio_id = upload_audio(client, sample_wav_bytes).json()["id"]
    recording_id = create_pending_recording(client, audio_id).json()["recordingId"]

    client.patch(
        f"/api/recordings/{recording_id}",
        json={"editedText": "Edited transcript text"},
    )
    transcribe_response = client.post(
        f"/api/recordings/{recording_id}/transcribe",
        json={"language": "auto"},
    )
    assert transcribe_response.status_code == 200

    recording_before = client.get(f"/api/recordings/{recording_id}").json()
    assert recording_before["rawText"]
    assert recording_before["editedText"] == "Edited transcript text"

    edit_response = _edit_source(
        client,
        recording_id,
        trimStartSec=0.0,
        trimEndSec=0.5,
        mode="replace",
    )
    assert edit_response.status_code == 200
    body = edit_response.json()
    assert body["recordingId"] == recording_id
    assert body["audioAssetId"] == audio_id
    assert body["status"] == "pending"
    assert body["durationSeconds"] is not None

    recording_after = client.get(f"/api/recordings/{recording_id}").json()
    assert recording_after["audioAssetId"] == audio_id
    assert recording_after["status"] == "pending"
    assert recording_after["rawText"] == ""
    assert recording_after["editedText"] == ""


@patch("app.domains.media.audio_edit_service.subprocess.run")
@patch("app.domains.media.audio_service.subprocess.run")
def test_edit_source_save_as_new(
    mock_audio_run,
    mock_edit_run,
    client,
    sample_wav_bytes,
):
    mock_audio_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)
    mock_edit_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    audio_id = upload_audio(client, sample_wav_bytes).json()["id"]
    recording_id = create_pending_recording(client, audio_id).json()["recordingId"]
    original_title = client.get(f"/api/recordings/{recording_id}").json()["title"]

    edit_response = _edit_source(
        client,
        recording_id,
        trimStartSec=0.0,
        trimEndSec=0.5,
        mode="save_as_new",
    )
    assert edit_response.status_code == 200
    body = edit_response.json()
    assert body["recordingId"] != recording_id
    assert body["audioAssetId"] != audio_id
    assert body["status"] == "pending"

    new_recording = client.get(f"/api/recordings/{body['recordingId']}").json()
    assert new_recording["title"] == f"{original_title} (edited)"
    assert new_recording["rawText"] == ""

    original_recording = client.get(f"/api/recordings/{recording_id}").json()
    assert original_recording["audioAssetId"] == audio_id


@patch("app.domains.media.audio_edit_service.subprocess.run")
@patch("app.domains.media.audio_service.subprocess.run")
def test_edit_source_rejects_short_trim(
    mock_audio_run,
    mock_edit_run,
    client,
    sample_wav_bytes,
):
    mock_audio_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)
    mock_edit_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    audio_id = upload_audio(client, sample_wav_bytes).json()["id"]
    recording_id = create_pending_recording(client, audio_id).json()["recordingId"]

    edit_response = _edit_source(
        client,
        recording_id,
        trimStartSec=0.0,
        trimEndSec=0.1,
        mode="replace",
    )
    assert edit_response.status_code == 400
    assert edit_response.json()["error"]["code"] == "AUDIO_EDIT_INVALID_TRIM"


@patch("app.domains.media.audio_edit_service.detect_speech_regions", return_value=[])
@patch("app.domains.media.audio_edit_service.subprocess.run")
@patch("app.domains.media.audio_service.subprocess.run")
def test_edit_source_remove_silence_no_speech(
    mock_audio_run,
    mock_edit_run,
    _mock_detect,
    client,
    sample_wav_bytes,
):
    mock_audio_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)
    mock_edit_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    audio_id = upload_audio(client, sample_wav_bytes).json()["id"]
    recording_id = create_pending_recording(client, audio_id).json()["recordingId"]

    edit_response = _edit_source(
        client,
        recording_id,
        removeSilence=True,
        mode="replace",
    )
    assert edit_response.status_code == 400
    assert edit_response.json()["error"]["code"] == "AUDIO_EDIT_NO_SPEECH"


@patch("app.domains.media.audio_edit_service.build_compressed_wav")
@patch("app.domains.media.audio_edit_service.merge_speech_regions")
@patch("app.domains.media.audio_edit_service.detect_speech_regions")
@patch("app.domains.media.audio_edit_service.subprocess.run")
@patch("app.domains.media.audio_service.subprocess.run")
def test_edit_source_remove_silence_shortens_output(
    mock_audio_run,
    mock_edit_run,
    mock_detect,
    mock_merge,
    mock_build,
    client,
    sample_wav_bytes,
    tmp_path: Path,
):
    mock_audio_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)
    mock_edit_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)
    mock_detect.return_value = [(0.0, 1.0), (3.0, 4.0)]
    mock_merge.return_value = [(0.0, 1.0), (3.0, 4.0)]

    def _build_compressed(_source_path, _regions, output_path):
        Path(output_path).write_bytes(sample_wav_bytes)
        return 2.0

    mock_build.side_effect = _build_compressed

    audio_id = upload_audio(client, sample_wav_bytes).json()["id"]
    recording_id = create_pending_recording(client, audio_id).json()["recordingId"]

    edit_response = _edit_source(
        client,
        recording_id,
        removeSilence=True,
        mode="replace",
    )
    assert edit_response.status_code == 200
    mock_detect.assert_called_once()
    mock_build.assert_called_once()
