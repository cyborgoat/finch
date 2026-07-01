from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.config import get_settings
from app.core.startup_diagnostics import get_capability_status_with_session
from app.storage.database import get_session

router = APIRouter(tags=["health"])


@router.get("/health")
def health(session: Session = Depends(get_session)) -> dict:
    settings = get_settings()
    capabilities = get_capability_status_with_session(session, settings)
    diarization_reason: str | None = capabilities.diarization_reason
    if (
        capabilities.diarization_enabled
        and not capabilities.diarization_ready
        and diarization_reason
    ):
        diarization_reason = (
            f"{diarization_reason} Set HF_TOKEN in .env or run huggingface-cli login."
        )

    return {
        "status": "ok",
        "app": settings.app_name,
        "capabilities": {
            "diarizationEnabled": capabilities.diarization_enabled,
            "diarizationReady": capabilities.diarization_ready,
            "diarizationReason": diarization_reason,
            "llmProvider": capabilities.llm_provider,
            "llmConfigured": capabilities.llm_configured,
            "openrouterConfigured": capabilities.openrouter_configured,
            "speakerMemoryEnabled": capabilities.speaker_memory_enabled,
            "speakerMemoryReady": capabilities.speaker_memory_ready,
            "speakerMemoryReason": capabilities.speaker_memory_reason,
            "speakerMemoryConsentGiven": capabilities.speaker_memory_consent_given,
        },
    }
