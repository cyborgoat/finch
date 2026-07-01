"""Test-only stand-ins. Never import this module from application code."""

from __future__ import annotations

from pathlib import Path

from app.services.asr_service import AsrResult
from app.services.diarization_service import DiarizationTurn

FAKE_TRANSCRIPT_TEXT = "Transcribed text for tests."
FAKE_LLM_MARKDOWN = "# Summary\n\nTest LLM output."


def fake_asr_result(
    text: str = FAKE_TRANSCRIPT_TEXT,
    language: str = "en",
) -> AsrResult:
    return AsrResult(text=text, language=language)


def fake_diarization_turns() -> list[DiarizationTurn]:
    return [
        DiarizationTurn("Speaker 1", 0.0, 5.0, cluster_id="SPEAKER_00"),
        DiarizationTurn("Speaker 2", 5.0, 10.0, cluster_id="SPEAKER_01"),
    ]


def fake_ffmpeg_run(sample_wav_bytes: bytes):
    def _run(cmd, check, capture_output, **_kwargs):
        output_path = Path(cmd[-1])
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(sample_wav_bytes)
        return type("Result", (), {"returncode": 0})()

    return _run
