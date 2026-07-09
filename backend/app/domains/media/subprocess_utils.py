import subprocess

from app.config import Settings, get_settings
from app.core.errors import AppError


def run_ffmpeg(
    args: list[str],
    *,
    settings: Settings | None = None,
    error_code: str = "AUDIO_NORMALIZATION_FAILED",
    error_message: str = "ffmpeg command failed.",
) -> subprocess.CompletedProcess[str]:
    resolved = settings or get_settings()
    command = ["ffmpeg", *args]
    try:
        return subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            timeout=resolved.ffmpeg_timeout_seconds,
        )
    except FileNotFoundError as exc:
        raise AppError(
            "AUDIO_NORMALIZATION_FAILED",
            "ffmpeg is not installed or not available on PATH.",
            500,
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise AppError(
            error_code,
            f"ffmpeg timed out after {resolved.ffmpeg_timeout_seconds} seconds.",
            504,
        ) from exc
    except subprocess.CalledProcessError as exc:
        raise AppError(
            error_code,
            error_message,
            500,
        ) from exc
