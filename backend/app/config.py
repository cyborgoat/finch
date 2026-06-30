from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_CANDIDATES = (_BACKEND_DIR / ".env", _BACKEND_DIR.parent / ".env")


def _resolve_env_files() -> tuple[str, ...]:
    existing = tuple(str(path) for path in _ENV_CANDIDATES if path.is_file())
    return existing or (str(_BACKEND_DIR / ".env"),)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_resolve_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Finch"
    app_env: str = "development"

    database_url: str = "sqlite:///./finch.db"

    data_dir: str = "./data"
    original_audio_dir: str = "./data/audio/original"
    normalized_audio_dir: str = "./data/audio/normalized"
    export_dir: str = "./data/exports"

    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_default_model: str = "openai/gpt-4.1-mini"

    asr_model_id: str = "Qwen/Qwen3-ASR-1.7B"
    asr_device: str = "auto"
    asr_dtype: str = "auto"
    asr_mock: bool = True

    llm_mock: bool = True

    diarization_enabled: bool = False
    diarization_mock: bool = True
    diarization_pipeline_id: str = "pyannote/speaker-diarization-community-1"
    diarization_use_original_audio: bool = False
    diarization_use_exclusive: bool = True
    diarization_min_segment_seconds: float = 0.3
    diarization_merge_gap_seconds: float = 0.5
    diarization_max_segments: int = 0
    hf_token: str | None = None

    max_upload_mb: int = 500
    max_audio_duration_seconds: int = 7200


@lru_cache
def get_settings() -> Settings:
    return Settings()
