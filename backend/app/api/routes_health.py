from fastapi import APIRouter

from app.config import get_settings
from app.core.startup_diagnostics import get_capability_status

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    settings = get_settings()
    capabilities = get_capability_status(settings)
    diarization_reason: str | None = capabilities.diarization_reason
    if (
        capabilities.diarization_enabled
        and not capabilities.diarization_mock
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
            "diarizationMock": capabilities.diarization_mock,
            "diarizationReady": capabilities.diarization_ready,
            "diarizationReason": diarization_reason,
            "asrMock": capabilities.asr_mock,
            "llmMock": capabilities.llm_mock,
            "openrouterConfigured": capabilities.openrouter_configured,
        },
    }
