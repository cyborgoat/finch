import logging

import pytest

from app.config import Settings
from app.core.startup_diagnostics import (
    get_capability_status,
    log_error_guidance,
    log_startup_summary,
)


@pytest.fixture
def caplog_info(caplog):
    caplog.set_level(logging.INFO)
    return caplog


def test_capability_status_diarization_not_ready_without_token():
    settings = Settings(
        diarization_enabled=True,
        diarization_mock=False,
        hf_token=None,
    )
    status = get_capability_status(settings)
    assert status.diarization_ready is False
    assert status.diarization_reason is not None


def test_capability_status_diarization_mock_is_ready():
    settings = Settings(
        diarization_enabled=True,
        diarization_mock=True,
        hf_token=None,
    )
    status = get_capability_status(settings)
    assert status.diarization_ready is True


def test_log_startup_summary_emits_configuration(caplog_info):
    settings = Settings(asr_mock=True, diarization_enabled=False, llm_mock=True)
    log_startup_summary(settings)
    output = caplog_info.text
    assert "Finch backend started" in output
    assert "Transcription (ASR)" in output
    assert "Speaker diarization" in output
    assert "AI actions (LLM)" in output
    assert "Dependencies" in output


def test_log_error_guidance_includes_remediation_steps(caplog_info):
    log_error_guidance(
        "DIARIZATION_MODEL_LOAD_FAILED",
        "HF_TOKEN is required for pyannote speaker diarization.",
    )
    output = caplog_info.text
    assert "Suggested fixes" in output
    assert "HF_TOKEN" in output
