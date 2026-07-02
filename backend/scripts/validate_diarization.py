#!/usr/bin/env python3
"""Validate Finch speaker diarization setup before transcribing."""

from __future__ import annotations

import argparse
import importlib.util
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import get_settings
from app.capabilities.checker import check_dependencies
from app.capabilities.status import get_capability_status
from app.domains.transcription.diarization_service import (
    DiarizationService,
    merge_adjacent_turns,
    resolve_hf_token,
    verify_huggingface_pipeline_access,
)


def _status(ok: bool) -> str:
    return "OK" if ok else "FAIL"


def _print_header(title: str) -> None:
    print(f"\n--- {title} ---")


def validate_config() -> list[str]:
    settings = get_settings()
    issues: list[str] = []

    _print_header("Configuration")
    print(f"  DIARIZATION_ENABLED={settings.diarization_enabled}")
    print(f"  DIARIZATION_USE_ORIGINAL_AUDIO={settings.diarization_use_original_audio}")
    print(f"  DIARIZATION_USE_EXCLUSIVE={settings.diarization_use_exclusive}")
    print(
        "  Tuning: "
        f"min_segment={settings.diarization_min_segment_seconds}s, "
        f"merge_gap={settings.diarization_merge_gap_seconds}s, "
        f"max_segments={settings.diarization_max_segments or 'unlimited'}"
    )

    if not settings.diarization_enabled:
        issues.append("DIARIZATION_ENABLED is false — enable it in .env to use speaker labels.")

    return issues


def validate_dependencies() -> list[str]:
    issues: list[str] = []
    _print_header("Dependencies")

    for dep in check_dependencies():
        print(f"  [{_status(dep.installed)}] {dep.name} — {dep.required_for}")
        if dep.name == "ffmpeg" and not dep.installed:
            issues.append("ffmpeg is missing (required for audio normalization and segment slicing).")
        if dep.name == "pyannote-audio" and not dep.installed:
            issues.append("pyannote-audio is missing — run: cd backend && uv add pyannote-audio")

    return issues


def validate_hf_access() -> list[str]:
    settings = get_settings()
    issues: list[str] = []
    token = resolve_hf_token(settings)

    _print_header("Hugging Face access")
    if not token:
        print("  [FAIL] No HF_TOKEN and no huggingface-cli login found.")
        issues.append(
            "Set HF_TOKEN in .env or run: huggingface-cli login"
        )
        return issues

    print(f"  [OK] Token found ({token[:8]}...)")
    ok, reason = verify_huggingface_pipeline_access(settings.diarization_pipeline_id, token)
    print(f"  [{_status(ok)}] Model access: {settings.diarization_pipeline_id}")
    if not ok:
        print(f"       {reason}")
        issues.append(reason or "Hugging Face model access denied.")
    else:
        print("       Gated model terms accepted for this token.")

    return issues


def validate_capabilities() -> list[str]:
    settings = get_settings()
    capabilities = get_capability_status(settings)
    issues: list[str] = []

    _print_header("Capability summary")
    print(f"  diarization_ready={capabilities.diarization_ready}")
    if capabilities.diarization_reason:
        print(f"  reason={capabilities.diarization_reason}")
        issues.append(capabilities.diarization_reason)

    return issues


def run_diarization_probe(audio_path: Path) -> list[str]:
    settings = get_settings()
    issues: list[str] = []

    if not audio_path.is_file():
        return [f"Audio file not found: {audio_path}"]

    _print_header(f"Diarization probe: {audio_path.name}")
    service = DiarizationService(settings)

    try:
        from app.domains.media.audio_service import AudioService

        duration = AudioService(None, settings).get_duration(str(audio_path))
        turns = service.diarize(str(audio_path), duration)
        merged = merge_adjacent_turns(
            turns,
            min_segment_seconds=settings.diarization_min_segment_seconds,
            merge_gap_seconds=settings.diarization_merge_gap_seconds,
            max_segments=settings.diarization_max_segments,
        )
        speakers = sorted({turn.speaker for turn in merged})
        print(f"  Duration: {duration:.1f}s")
        print(f"  Raw turns: {len(turns)} → merged segments: {len(merged)}")
        print(f"  Speakers: {', '.join(speakers) or 'none'}")
        for index, turn in enumerate(merged[:8], start=1):
            print(
                f"    {index}. {turn.speaker} "
                f"{turn.start_sec:.1f}s–{turn.end_sec:.1f}s "
                f"({turn.end_sec - turn.start_sec:.1f}s)"
            )
        if len(merged) > 8:
            print(f"    ... and {len(merged) - 8} more segment(s)")
    except Exception as exc:
        issues.append(f"Diarization probe failed: {exc}")
        print(f"  [FAIL] {exc}")
    finally:
        service.unload_pipeline()

    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Finch diarization setup.")
    parser.add_argument(
        "--audio",
        type=Path,
        help="Optional audio file to run a diarization-only probe (no ASR).",
    )
    args = parser.parse_args()

    print("Finch diarization validation")
    print("=" * 40)

    issues: list[str] = []
    issues.extend(validate_config())
    issues.extend(validate_dependencies())

    settings = get_settings()
    if settings.diarization_enabled:
        issues.extend(validate_hf_access())
        issues.extend(validate_capabilities())
        if args.audio:
            issues.extend(run_diarization_probe(args.audio))
    else:
        _print_header("Skipping HF and probe checks")
        print("  Enable DIARIZATION_ENABLED=true for full validation.")

    _print_header("Result")
    if issues:
        print("  Diarization is NOT ready. Fix the items below and re-run:")
        for item in issues:
            print(f"    • {item}")
        print("\n  Guide: docs/diarization.md")
        return 1

    print("  Diarization setup looks good.")
    if args.audio:
        print("  Probe completed — re-transcribe in the app to get speaker-labeled output.")
    else:
        print("  Optional: uv run python scripts/validate_diarization.py --audio path/to/file.wav")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
