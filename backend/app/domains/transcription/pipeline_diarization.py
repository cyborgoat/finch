from app.capabilities.hf_hints import format_diarization_fallback_note
from app.core.errors import AppError

DIARIZATION_FALLBACK_CODES = {"DIARIZATION_MODEL_LOAD_FAILED", "DIARIZATION_FAILED"}


def should_fallback_from_diarization(exc: AppError) -> bool:
    return exc.code in DIARIZATION_FALLBACK_CODES


def build_diarization_fallback_note(exc: AppError) -> str:
    return format_diarization_fallback_note(exc.message)
