
from pathlib import Path

import numpy as np
import soundfile as sf

from app.config import Settings
from app.domains.transcription.diarization_service import (
    DiarizationTurn,
    SpeakerSegment,
    build_labeled_transcript,
    format_diarization_load_error,
    load_audio_for_diarization,
    merge_adjacent_turns,
)


def test_merge_adjacent_turns():
    turns = merge_adjacent_turns(
        [
            DiarizationTurn("Speaker 1", 0.0, 2.0),
            DiarizationTurn("Speaker 1", 2.0, 4.0),
            DiarizationTurn("Speaker 2", 4.0, 6.0),
        ]
    )
    assert len(turns) == 2
    assert turns[0].end_sec == 4.0


def test_merge_adjacent_turns_with_gap_tolerance():
    turns = merge_adjacent_turns(
        [
            DiarizationTurn("Speaker 1", 0.0, 2.0),
            DiarizationTurn("Speaker 1", 2.4, 4.0),
            DiarizationTurn("Speaker 2", 4.0, 6.0),
        ],
        merge_gap_seconds=0.5,
    )
    assert len(turns) == 2
    assert turns[0].end_sec == 4.0


def test_merge_adjacent_turns_respects_max_segments():
    turns = merge_adjacent_turns(
        [
            DiarizationTurn("Speaker 1", 0.0, 1.0),
            DiarizationTurn("Speaker 2", 1.0, 2.0),
            DiarizationTurn("Speaker 1", 2.0, 3.0),
            DiarizationTurn("Speaker 2", 3.0, 4.0),
        ],
        min_segment_seconds=0.3,
        max_segments=2,
    )
    assert len(turns) == 2


def test_merge_adjacent_turns_filters_short_segments():
    turns = merge_adjacent_turns(
        [DiarizationTurn("Speaker 1", 0.0, 0.1)],
        min_segment_seconds=0.3,
    )
    assert turns == []


def test_build_labeled_transcript():
    text = build_labeled_transcript(
        [
            SpeakerSegment(speaker="Speaker 1", start_sec=0, end_sec=2, text="Hello"),
            SpeakerSegment(speaker="Speaker 2", start_sec=2, end_sec=4, text="Hi there"),
        ]
    )
    assert text == "Speaker 1: Hello\n\nSpeaker 2: Hi there"


def test_resolve_hf_token_prefers_settings():
    from app.domains.transcription.diarization_service import resolve_hf_token

    settings = Settings(hf_token="from-settings")
    assert resolve_hf_token(settings) == "from-settings"


def test_format_diarization_load_error_detects_gated_repo():
    exc = Exception(
        "403 Client Error. Cannot access gated repo for url "
        "https://huggingface.co/pyannote/speaker-diarization-community-1/resolve/main/config.yaml"
    )
    message = format_diarization_load_error(exc, "pyannote/speaker-diarization-community-1")
    assert "403 gated repo" in message
    assert "Agree and access repository" in message


def test_format_diarization_load_error_generic():
    message = format_diarization_load_error(
        Exception("network timeout"),
        "pyannote/speaker-diarization-community-1",
    )
    assert "network timeout" in message


def test_load_audio_for_diarization_returns_channel_first_waveform(tmp_path: Path):
    audio_path = tmp_path / "probe.wav"
    sample_rate = 16000
    samples = np.zeros((sample_rate, 1), dtype=np.float32)
    samples[100:200, 0] = 0.25
    sf.write(audio_path, samples, sample_rate)

    payload = load_audio_for_diarization(str(audio_path))

    assert payload["sample_rate"] == sample_rate
    assert tuple(payload["waveform"].shape) == (1, sample_rate)
    assert float(payload["waveform"][0, 150]) == 0.25
