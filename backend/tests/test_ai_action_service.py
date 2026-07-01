from unittest.mock import MagicMock

import pytest

from app.core.errors import AppError
from app.models.transcript import Transcript
from app.schemas.user_settings import UserSettingsResponse
from app.services.ai_action_service import AiActionService
from tests.support.fakes import FAKE_LLM_MARKDOWN


def test_run_summary_includes_user_preferences_in_prompt():
    service = AiActionService(MagicMock())

    transcript = Transcript(
        id="transcript_test12345678",
        audio_asset_id="audio_test1234567890",
        title="Team sync",
        raw_text="We discussed the roadmap.",
        status="draft",
    )

    user_settings = UserSettingsResponse(
        language="zh",
        summary_style="detailed",
        summary_format="bullets",
        user_name="Alex",
    )

    mock_llm = MagicMock(return_value=FAKE_LLM_MARKDOWN)
    service.llm_service.chat_completion = mock_llm

    service.run_summary(
        transcript,
        source="rawText",
        user_settings=user_settings,
    )

    messages = mock_llm.call_args.args[0]
    prompt = messages[0]["content"]
    assert "User preferences:" in prompt
    assert "中文 (Chinese)" in prompt
    assert "detailed" in prompt
    assert "bullet points" in prompt
    assert "Alex" in prompt
    assert "We discussed the roadmap." in prompt


def test_run_action_rejects_unknown_action():
    service = AiActionService(MagicMock())

    transcript = Transcript(
        id="transcript_test12345678",
        audio_asset_id="audio_test1234567890",
        title="Team sync",
        raw_text="We discussed the roadmap.",
        status="draft",
    )

    with pytest.raises(AppError) as exc_info:
        service.run_action(transcript, action="action_items", source="rawText")
    assert exc_info.value.code == "AI_ACTION_INVALID"
