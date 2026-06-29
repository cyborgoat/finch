from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

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

    max_upload_mb: int = 500
    max_audio_duration_seconds: int = 7200


@lru_cache
def get_settings() -> Settings:
    return Settings()
