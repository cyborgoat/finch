from sqlmodel import SQLModel

import app.models  # noqa: F401 — register SQLModel tables


def test_schema_tables_match_alembic_baseline():
    expected = {
        "apppreference",
        "audioasset",
        "job",
        "note",
        "recording",
        "voiceprintembedding",
        "voiceprintprofile",
    }
    actual = set(SQLModel.metadata.tables.keys())
    assert actual == expected
