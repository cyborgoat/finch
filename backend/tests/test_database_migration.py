import sqlite3

from sqlmodel import Session, select

from app.config import get_settings
from app.models.transcript import Transcript
from app.storage.database import create_db_and_tables, get_engine, reset_engine


def test_sqlite_migration_adds_speaker_segments_column(tmp_path, monkeypatch):
    db_path = tmp_path / "legacy.db"
    with sqlite3.connect(db_path) as connection:
        connection.executescript(
            """
            CREATE TABLE audioasset (
                id TEXT PRIMARY KEY,
                source TEXT NOT NULL,
                filename TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                duration_seconds REAL,
                original_path TEXT,
                normalized_path TEXT,
                created_at TEXT NOT NULL
            );
            CREATE TABLE transcript (
                id TEXT PRIMARY KEY,
                audio_asset_id TEXT NOT NULL,
                title TEXT NOT NULL,
                raw_text TEXT NOT NULL,
                edited_text TEXT,
                language TEXT,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            INSERT INTO audioasset (
                id, source, filename, mime_type, size_bytes, created_at
            ) VALUES (
                'audio_test', 'upload', 'sample.wav', 'audio/wav', 100, '2026-01-01T00:00:00'
            );
            INSERT INTO transcript (
                id, audio_asset_id, title, raw_text, status, created_at, updated_at
            ) VALUES (
                'b1b1b1b1b1b1b1b1', 'audio_test', 'Sample', 'Hello', 'draft',
                '2026-01-01T00:00:00', '2026-01-01T00:00:00'
            );
            """
        )

    database_url = f"sqlite:///{db_path}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    get_settings.cache_clear()
    reset_engine(database_url)
    create_db_and_tables()

    with sqlite3.connect(db_path) as connection:
        columns = {row[1] for row in connection.execute("PRAGMA table_info(transcript)")}
    assert "speaker_segments" in columns

    with Session(get_engine()) as session:
        transcript = session.exec(
            select(Transcript).where(Transcript.id == "b1b1b1b1b1b1b1b1")
        ).one()
        assert transcript.raw_text == "Hello"
        assert transcript.speaker_segments is None
