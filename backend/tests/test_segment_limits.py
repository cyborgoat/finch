
from app.config import Settings
from app.domains.transcription.segment_limits import (
    append_processing_note,
    build_segment_cap_note,
    resolve_effective_max_segments,
)


def test_resolve_effective_max_segments_respects_configured_cap():
    settings = Settings(diarization_max_segments=25)
    assert resolve_effective_max_segments(settings, 7200) == 25


def test_resolve_effective_max_segments_unlimited_when_zero():
    settings = Settings(diarization_max_segments=0)
    assert resolve_effective_max_segments(settings, 7200) == 0
    assert resolve_effective_max_segments(settings, 4000) == 0


def test_build_segment_cap_note_includes_duration_summary():
    note = build_segment_cap_note(
        max_segments=50,
        audio_duration_sec=7200,
        transcribed_until_sec=2520,
        total_segments_before_cap=180,
    )
    assert "50 segments" in note
    assert "42.0 min" in note
    assert "120.0 min" in note
    assert "180 segment(s)" in note


def test_append_processing_note_joins_messages():
    assert append_processing_note(None, "Second") == "Second"
    assert append_processing_note("First", "Second") == "First\n\nSecond"
