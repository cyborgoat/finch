from io import BytesIO
from unittest.mock import patch

from app.config import get_settings
from tests.support.fakes import fake_ffmpeg_run


@patch("app.domains.media.audio_service.subprocess.run")
def test_upload_rejects_oversized_file_during_stream(mock_run, client, sample_wav_bytes, monkeypatch):
    mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)
    monkeypatch.setenv("MAX_UPLOAD_MB", "1")
    get_settings.cache_clear()

    oversized = b"x" * (1024 * 1024 + 1)
    response = client.post(
        "/api/audio/upload",
        data={"source": "upload"},
        files={"file": ("large.wav", BytesIO(oversized), "audio/wav")},
    )

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "AUDIO_FILE_TOO_LARGE"
