HF_TOKEN_ENV_HINT = "Set HF_TOKEN in .env or run huggingface-cli login, then re-transcribe."


def format_diarization_fallback_note(reason: str) -> str:
    return f"Speaker labels unavailable: {reason} {HF_TOKEN_ENV_HINT}"


def format_health_diarization_reason(reason: str) -> str:
    return f"{reason} Set HF_TOKEN in backend .env."
