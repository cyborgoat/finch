from pathlib import Path
from unittest.mock import patch

import numpy as np
import pytest
import soundfile as sf

from app.domains.transcription.audio_purification_service import (
    AudioPurificationService,
    PurifiedAudio,
    SpeechRegion,
    build_time_map,
    cleanup_purified,
    format_purification_note,
    merge_speech_regions,
    remap_compressed_to_original,
    remap_turns_to_original,
)
from app.domains.transcription.types import DiarizationTurn


def test_merge_speech_regions_merges_small_gaps():
    regions = [(0.0, 1.0), (1.2, 2.0), (4.0, 5.0)]
    merged = merge_speech_regions(
        regions,
        merge_gap_seconds=0.3,
        min_speech_seconds=0.25,
    )
    assert merged == [(0.0, 2.0), (4.0, 5.0)]


def test_merge_speech_regions_drops_short_segments():
    regions = [(0.0, 0.1), (2.0, 5.0)]
    merged = merge_speech_regions(
        regions,
        merge_gap_seconds=0.3,
        min_speech_seconds=0.25,
    )
    assert merged == [(2.0, 5.0)]


def test_build_time_map_assigns_compressed_offsets():
    time_map = build_time_map([(10.0, 12.0), (20.0, 23.0)])
    assert time_map == [
        SpeechRegion(original_start=10.0, original_end=12.0, compressed_start=0.0),
        SpeechRegion(original_start=20.0, original_end=23.0, compressed_start=2.0),
    ]


def test_remap_compressed_to_original_single_region():
    time_map = [SpeechRegion(original_start=10.0, original_end=20.0, compressed_start=0.0)]
    assert remap_compressed_to_original(0.0, time_map) == 10.0
    assert remap_compressed_to_original(5.0, time_map) == 15.0
    assert remap_compressed_to_original(10.0, time_map) == 20.0


def test_remap_compressed_to_original_multi_region():
    time_map = build_time_map([(0.0, 2.0), (10.0, 13.0)])
    assert remap_compressed_to_original(1.0, time_map) == 1.0
    assert remap_compressed_to_original(2.5, time_map) == 10.5
    assert remap_compressed_to_original(5.0, time_map, is_end=True) == 13.0


def test_remap_compressed_to_original_region_boundary():
    time_map = build_time_map([(100.0, 105.0), (200.0, 205.0)])
    assert remap_compressed_to_original(5.0, time_map, is_end=False) == 200.0
    assert remap_compressed_to_original(5.0, time_map, is_end=True) == 105.0


def test_remap_turns_to_original():
    time_map = build_time_map([(100.0, 110.0), (200.0, 205.0)])
    turns = [
        DiarizationTurn("Speaker 1", 0.0, 5.0, cluster_id="SPEAKER_00"),
        DiarizationTurn("Speaker 2", 7.0, 10.0, cluster_id="SPEAKER_01"),
    ]
    remapped = remap_turns_to_original(turns, time_map)
    assert remapped[0].start_sec == 100.0
    assert remapped[0].end_sec == 105.0
    assert remapped[1].start_sec == 107.0
    assert remapped[1].end_sec == 110.0


def test_format_purification_note():
    note = format_purification_note(3720.0, 2460.0)
    assert "62.0 min" in note
    assert "41.0 min" in note


def test_cleanup_purified_removes_temp_dir(tmp_path: Path):
    temp_dir = tmp_path / "purify"
    temp_dir.mkdir()
    (temp_dir / "purified.wav").write_bytes(b"wav")
    purified = PurifiedAudio(
        path=str(temp_dir / "purified.wav"),
        duration_sec=1.0,
        time_map=[],
        temp_dir=temp_dir,
        original_duration_sec=2.0,
    )
    cleanup_purified(purified)
    assert not temp_dir.exists()


def test_prepare_for_diarization_builds_compressed_audio(tmp_path: Path):
    source_path = tmp_path / "source.wav"
    sample_rate = 16000
    duration_sec = 4.0
    samples = np.zeros(int(sample_rate * duration_sec), dtype=np.float32)
    samples[int(0.5 * sample_rate) : int(1.5 * sample_rate)] = 0.5
    samples[int(2.5 * sample_rate) : int(3.5 * sample_rate)] = 0.5
    sf.write(source_path, samples, sample_rate)

    with patch(
        "app.domains.transcription.audio_purification_service.detect_speech_regions",
        return_value=[(0.5, 1.5), (2.5, 3.5)],
    ):
        service = AudioPurificationService()
        purified = service.prepare_for_diarization(str(source_path))

    assert purified is not None
    assert Path(purified.path).is_file()
    assert purified.duration_sec == pytest.approx(2.0, abs=0.1)
    assert len(purified.time_map) == 2
    cleanup_purified(purified)


def test_prepare_for_diarization_returns_none_when_no_speech(tmp_path: Path):
    source_path = tmp_path / "silent.wav"
    sf.write(source_path, np.zeros(16000, dtype=np.float32), 16000)

    with patch(
        "app.domains.transcription.audio_purification_service.detect_speech_regions",
        return_value=[],
    ):
        service = AudioPurificationService()
        purified = service.prepare_for_diarization(str(source_path))

    assert purified is None
