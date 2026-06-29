import wave
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel

from app.config import Settings, get_settings
from app.main import create_app
from app.storage import database


@pytest.fixture
def test_settings(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Settings:
    data_dir = tmp_path / "data"
    original_dir = data_dir / "audio" / "original"
    normalized_dir = data_dir / "audio" / "normalized"
    export_dir = data_dir / "exports"
    for directory in (original_dir, normalized_dir, export_dir):
        directory.mkdir(parents=True)

    db_path = tmp_path / "test.db"
    settings = Settings(
        database_url=f"sqlite:///{db_path}",
        data_dir=str(data_dir),
        original_audio_dir=str(original_dir),
        normalized_audio_dir=str(normalized_dir),
        export_dir=str(export_dir),
        asr_mock=True,
    )

    monkeypatch.setenv("DATABASE_URL", settings.database_url)
    monkeypatch.setenv("DATA_DIR", settings.data_dir)
    monkeypatch.setenv("ORIGINAL_AUDIO_DIR", settings.original_audio_dir)
    monkeypatch.setenv("NORMALIZED_AUDIO_DIR", settings.normalized_audio_dir)
    monkeypatch.setenv("EXPORT_DIR", settings.export_dir)
    monkeypatch.setenv("ASR_MOCK", "true")
    get_settings.cache_clear()
    database.reset_engine(settings.database_url)
    return settings


@pytest.fixture
def client(test_settings: Settings) -> Generator[TestClient]:
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client
    get_settings.cache_clear()
    database.reset_engine()
    SQLModel.metadata.drop_all(database.get_engine())


@pytest.fixture
def sample_wav_bytes() -> bytes:
    path = Path(__file__).parent / "fixtures" / "sample.wav"
    return path.read_bytes()


def make_silent_wav(path: Path, duration_seconds: float = 0.5, sample_rate: int = 16000) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    num_frames = int(duration_seconds * sample_rate)
    with wave.open(str(path), "w") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(b"\x00\x00" * num_frames)
