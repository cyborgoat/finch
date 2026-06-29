from io import BytesIO
from unittest.mock import patch


def test_upload_rejects_empty_file(client):
    response = client.post(
        "/api/audio/upload",
        data={"source": "upload"},
        files={"file": ("empty.wav", BytesIO(b""), "audio/wav")},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "AUDIO_UNSUPPORTED_TYPE"


def test_upload_rejects_unsupported_type(client):
    response = client.post(
        "/api/audio/upload",
        data={"source": "upload"},
        files={"file": ("notes.txt", BytesIO(b"hello"), "text/plain")},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "AUDIO_UNSUPPORTED_TYPE"


@patch("app.services.audio_service.subprocess.run")
def test_upload_stores_valid_wav(mock_run, client, sample_wav_bytes):
    from pathlib import Path

    def fake_ffmpeg(cmd, check, capture_output):
        output_path = Path(cmd[-1])
        output_path.write_bytes(sample_wav_bytes)
        return type("Result", (), {"returncode": 0})()

    mock_run.side_effect = fake_ffmpeg

    response = client.post(
        "/api/audio/upload",
        data={"source": "upload"},
        files={"file": ("sample.wav", BytesIO(sample_wav_bytes), "audio/wav")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"].startswith("audio_")
    assert body["source"] == "upload"
    assert body["mimeType"] == "audio/wav"
    assert body["sizeBytes"] == len(sample_wav_bytes)
    assert body["durationSeconds"] is not None

    get_response = client.get(f"/api/audio/{body['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["id"] == body["id"]


@patch("app.services.audio_service.subprocess.run")
def test_upload_accepts_webm_with_codec_param(mock_run, client, sample_wav_bytes):
    from pathlib import Path

    def fake_ffmpeg(cmd, check, capture_output):
        output_path = Path(cmd[-1])
        output_path.write_bytes(sample_wav_bytes)
        return type("Result", (), {"returncode": 0})()

    mock_run.side_effect = fake_ffmpeg

    response = client.post(
        "/api/audio/upload",
        data={"source": "recording"},
        files={
            "file": (
                "recording.webm",
                BytesIO(b"fake-webm-bytes"),
                "audio/webm;codecs=opus",
            )
        },
    )

    assert response.status_code == 200
    assert response.json()["mimeType"] == "audio/webm"
    assert response.json()["source"] == "recording"
