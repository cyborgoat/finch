from unittest.mock import MagicMock, patch

import pytest

from app.core.errors import AppError
from app.models.recording import Recording
from app.schemas.user_settings import UserSettingsResponse
from app.services.ai_action_service import AiActionService
from app.services.diarization_service import SpeakerSegment, speaker_segments_to_json
from app.services import transcript_text_service
from tests.support.fakes import FAKE_LLM_MARKDOWN


def test_run_meeting_summary_includes_user_preferences_in_prompt():
    service = AiActionService(MagicMock())

    transcript = Recording(
        id="recording_test12345678",
        audio_asset_id="audio_test1234567890",
        title="Team sync",
        raw_text="We discussed the roadmap.",
        status="draft",
    )

    user_settings = UserSettingsResponse(
        content_language="zh",
        summary_style="detailed",
        summary_format="bullets",
        user_name="Alex",
    )

    mock_llm = MagicMock(return_value=FAKE_LLM_MARKDOWN)
    service.llm_service.chat_completion = mock_llm

    service.run_action(
        transcript,
        action="meeting_summary",
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


def test_run_action_items_includes_content_language():
    service = AiActionService(MagicMock())

    transcript = Recording(
        id="recording_test12345678",
        audio_asset_id="audio_test1234567890",
        title="Team sync",
        raw_text="We discussed the roadmap.",
        status="draft",
    )

    user_settings = UserSettingsResponse(content_language="zh")

    mock_llm = MagicMock(return_value=FAKE_LLM_MARKDOWN)
    service.llm_service.chat_completion = mock_llm

    service.run_action(
        transcript,
        action="action_items",
        source="rawText",
        user_settings=user_settings,
    )

    prompt = mock_llm.call_args.args[0][0]["content"]
    assert "Response language: 中文 (Chinese)" in prompt
    assert "Summary style" not in prompt


def test_run_action_rejects_unknown_action():
    service = AiActionService(MagicMock())

    transcript = Recording(
        id="recording_test12345678",
        audio_asset_id="audio_test1234567890",
        title="Team sync",
        raw_text="We discussed the roadmap.",
        status="draft",
    )

    with pytest.raises(AppError) as exc_info:
        service.run_action(transcript, action="unknown_action", source="rawText")
    assert exc_info.value.code == "AI_ACTION_INVALID"


def test_run_action_supports_legacy_markdown_summary_alias():
    service = AiActionService(MagicMock())

    transcript = Recording(
        id="recording_test12345678",
        audio_asset_id="audio_test1234567890",
        title="Team sync",
        raw_text="We discussed the roadmap.",
        status="draft",
    )

    mock_llm = MagicMock(return_value=FAKE_LLM_MARKDOWN)
    service.llm_service.chat_completion = mock_llm

    _title, note_type, _markdown = service.run_action(
        transcript,
        action="markdown_summary",
        source="rawText",
    )

    assert note_type == "meeting_summary"


def test_resolve_transcript_text_uses_voice_profile_names():
    session = MagicMock()
    service = AiActionService(session)

    segments = [
        SpeakerSegment(
            speaker="Speaker 1",
            start_sec=0.0,
            end_sec=2.0,
            text="Hello everyone.",
            cluster_id="SPEAKER_00",
            speaker_profile_id="speaker_profile12345678",
        ),
        SpeakerSegment(
            speaker="Speaker 2",
            start_sec=2.0,
            end_sec=4.0,
            text="Thanks for joining.",
            cluster_id="SPEAKER_01",
        ),
    ]
    transcript = Recording(
        id="recording_test12345678",
        audio_asset_id="audio_test1234567890",
        title="Team sync",
        raw_text="Speaker 1: Hello everyone.\n\nSpeaker 2: Thanks for joining.",
        speaker_segments=speaker_segments_to_json(segments),
        status="draft",
    )

    with patch.object(
        transcript_text_service,
        "load_profile_display_names",
        return_value={"speaker_profile12345678": "Robert"},
    ):
        text = service.resolve_transcript_text(transcript, "editedText")

    assert text == "Robert: Hello everyone.\n\nSpeaker 2: Thanks for joining."


def test_run_action_uses_profile_names_in_prompt():
    session = MagicMock()
    service = AiActionService(session)

    segments = [
        SpeakerSegment(
            speaker="Speaker 1",
            start_sec=0.0,
            end_sec=2.0,
            text="We discussed the roadmap.",
            cluster_id="SPEAKER_00",
            speaker_profile_id="speaker_profile12345678",
        ),
    ]
    transcript = Recording(
        id="recording_test12345678",
        audio_asset_id="audio_test1234567890",
        title="Team sync",
        raw_text="Speaker 1: We discussed the roadmap.",
        speaker_segments=speaker_segments_to_json(segments),
        status="draft",
    )

    mock_llm = MagicMock(return_value=FAKE_LLM_MARKDOWN)
    service.llm_service.chat_completion = mock_llm

    with patch.object(
        transcript_text_service,
        "load_profile_display_names",
        return_value={"speaker_profile12345678": "Robert"},
    ):
        service.run_action(
            transcript,
            action="meeting_summary",
            source="editedText",
        )

    prompt = mock_llm.call_args.args[0][0]["content"]
    assert "Robert: We discussed the roadmap." in prompt
    assert "Speaker 1:" not in prompt
