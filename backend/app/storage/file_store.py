from pathlib import Path

from app.config import Settings


def ensure_data_dirs(settings: Settings) -> None:
    for directory in (
        settings.data_dir,
        settings.original_audio_dir,
        settings.normalized_audio_dir,
    ):
        Path(directory).mkdir(parents=True, exist_ok=True)


def safe_join(base_dir: str, filename: str) -> Path:
    base = Path(base_dir).resolve()
    target = (base / filename).resolve()
    if not str(target).startswith(str(base)):
        raise ValueError("Invalid file path")
    return target
