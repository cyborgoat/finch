from app.config import Settings


def resolve_effective_max_segments(settings: Settings) -> int:
    configured = settings.diarization_max_segments
    return configured if configured > 0 else 0


def build_segment_cap_note(
    *,
    max_segments: int,
    audio_duration_sec: float,
    transcribed_until_sec: float,
    total_segments_before_cap: int,
) -> str:
    audio_min = audio_duration_sec / 60
    transcribed_min = transcribed_until_sec / 60
    return (
        f"Speaker diarization capped at {max_segments} segments "
        f"(~first {transcribed_min:.1f} min of {audio_min:.1f} min; "
        f"{total_segments_before_cap} segment(s) detected). "
        "Increase DIARIZATION_MAX_SEGMENTS or split the file for full coverage."
    )
