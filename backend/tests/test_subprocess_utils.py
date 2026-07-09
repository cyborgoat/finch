from unittest.mock import patch

import pytest

from app.config import Settings
from app.core.errors import AppError
from app.domains.media.subprocess_utils import run_ffmpeg


def test_run_ffmpeg_raises_on_timeout():
    settings = Settings(ffmpeg_timeout_seconds=30)
    with patch("app.domains.media.subprocess_utils.subprocess.run") as mock_run:
        mock_run.side_effect = __import__("subprocess").TimeoutExpired(
            cmd=["ffmpeg"],
            timeout=30,
        )
        with pytest.raises(AppError) as exc_info:
            run_ffmpeg(["-version"], settings=settings)
    assert exc_info.value.code == "AUDIO_NORMALIZATION_FAILED"
    assert "timed out after 30 seconds" in exc_info.value.message
