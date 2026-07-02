import sqlite3

from app.config import get_settings
from app.storage.database import create_db_and_tables, reset_engine


def test_alembic_creates_fresh_schema(tmp_path, monkeypatch):
    db_path = tmp_path / "fresh.db"
    database_url = f"sqlite:///{db_path}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    get_settings.cache_clear()
    reset_engine(database_url)
    create_db_and_tables()

    with sqlite3.connect(db_path) as connection:
        tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
        }
    assert "recording" in tables
    assert "alembic_version" in tables
