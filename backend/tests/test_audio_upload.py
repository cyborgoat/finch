from io import BytesIO
from unittest.mock import patch

from tests.support.fakes import fake_ffmpeg_run


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
    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

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
def test_stream_audio_returns_playback_file(mock_run, client, sample_wav_bytes):
    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    upload_response = client.post(
        "/api/audio/upload",
        data={"source": "upload"},
        files={"file": ("sample.wav", BytesIO(sample_wav_bytes), "audio/wav")},
    )
    audio_id = upload_response.json()["id"]

    stream_response = client.get(f"/api/audio/{audio_id}/stream")
    assert stream_response.status_code == 200
    assert stream_response.headers["content-type"] == "audio/wav"
    assert stream_response.content == sample_wav_bytes


@patch("app.services.audio_service.subprocess.run")
def test_upload_accepts_webm_with_codec_param(mock_run, client, sample_wav_bytes):
    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

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


@patch("app.services.audio_service.subprocess.run")
def test_upload_accepts_mp3_with_octet_stream(mock_run, client, sample_wav_bytes):
    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    response = client.post(
        "/api/audio/upload",
        data={"source": "upload"},
        files={
            "file": (
                "recording.mp3",
                BytesIO(b"fake-mp3-bytes"),
                "application/octet-stream",
            )
        },
    )

    assert response.status_code == 200
    assert response.json()["mimeType"] == "audio/mpeg"


@patch("app.services.audio_service.subprocess.run")
def test_upload_accepts_audio_mp3(mock_run, client, sample_wav_bytes):
    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)

    response = client.post(
        "/api/audio/upload",
        data={"source": "upload"},
        files={
            "file": (
                "recording.mp3",
                BytesIO(b"fake-mp3-bytes"),
                "audio/mp3",
            )
        },
    )

    assert response.status_code == 200
    assert response.json()["mimeType"] == "audio/mp3"
