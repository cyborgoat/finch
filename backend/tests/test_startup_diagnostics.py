from unittest.mock import patch

from app.capabilities.checker import check_dependencies
from app.capabilities.error_catalog import log_error_guidance
from app.capabilities.startup import log_startup_summary
from app.capabilities.status import get_capability_status
from app.config import Settings


def test_capability_status_diarization_not_ready_without_token():
    settings = Settings(
        diarization_enabled=True,
        hf_token=None,
    )
    status = get_capability_status(settings)
    assert status.diarization_ready is False
    assert status.diarization_reason is not None


def test_capability_status_diarization_disabled_is_ready():
    settings = Settings(diarization_enabled=False)
    status = get_capability_status(settings)
    assert status.diarization_ready is True


def test_capability_status_llm_not_configured_by_default():
    settings = Settings()
    status = get_capability_status(settings)
    assert status.llm_provider == "openrouter"
    assert status.llm_configured is False
    assert status.openrouter_configured is False


def _logged_messages(mock) -> str:
    parts: list[str] = []
    for call in mock.call_args_list:
        if len(call.args) >= 2:
            try:
                parts.append(call.args[0] % call.args[1:])
            except (TypeError, ValueError):
                parts.extend(str(arg) for arg in call.args)
        elif call.args:
            parts.append(str(call.args[0]))
    return " ".join(parts)


def test_log_startup_summary_emits_configuration(tmp_path, monkeypatch):
    from app.config import get_settings
    from app.storage.database import create_db_and_tables, reset_engine

    db_path = tmp_path / "startup.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    get_settings.cache_clear()
    reset_engine(f"sqlite:///{db_path}")
    create_db_and_tables()

    settings = Settings(diarization_enabled=False)
    with patch("app.capabilities.startup.logger.info") as mock_info:
        log_startup_summary(settings)
        messages = _logged_messages(mock_info)

    assert "Finch backend started" in messages
    assert "Transcription (ASR)" in messages
    assert "Speaker diarization" in messages
    assert "Voiceprint profiles" in messages
    assert "Transcript summarization (LLM)" in messages
    assert "Dependencies" in messages


def test_check_dependencies_includes_speaker_embedding_packages():
    deps = check_dependencies()
    names = {dep.name for dep in deps}
    assert "omegaconf" in names
    assert "speechbrain" in names


def test_log_error_guidance_speaker_embedding():
    with patch("app.capabilities.error_catalog.logger.error") as mock_error:
        log_error_guidance(
            "SPEAKER_EMBEDDING_MODEL_LOAD_FAILED",
            "No module named 'omegaconf'",
        )
        messages = _logged_messages(mock_error)

    assert "Suggested fixes" in messages
    assert "omegaconf" in messages


def test_log_error_guidance_includes_remediation_steps():
    with patch("app.capabilities.error_catalog.logger.error") as mock_error:
        log_error_guidance(
            "DIARIZATION_MODEL_LOAD_FAILED",
            "HF_TOKEN is required for pyannote speaker diarization.",
        )
        messages = _logged_messages(mock_error)

    assert "Suggested fixes" in messages
    assert "HF_TOKEN" in messages
