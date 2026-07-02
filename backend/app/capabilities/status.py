from dataclasses import dataclass

from app.capabilities.checker import dependency_installed
from app.config import Settings, get_settings
from app.core.errors import AppError
from app.domains.transcription.diarization_service import (
    get_cached_pipeline_access,
    resolve_hf_token,
)


@dataclass(frozen=True)
class CapabilityStatus:
    diarization_enabled: bool
    diarization_ready: bool
    diarization_reason: str | None
    llm_provider: str
    llm_configured: bool
    openrouter_configured: bool
    voiceprint_profiles_enabled: bool
    voiceprint_profiles_ready: bool
    voiceprint_profiles_reason: str | None
    voiceprint_profiles_consent_given: bool


@dataclass(frozen=True)
class VoiceprintProfilesStatus:
    ready: bool
    reason: str | None


def _get_llm_capability(settings: Settings, session=None) -> tuple[str, bool]:
    from app.domains.ai.llm.config import resolve_llm_config
    from app.domains.ai.llm.runtime import LlmRuntimeSettings

    runtime: LlmRuntimeSettings
    if session is not None:
        from app.domains.settings.llm_settings_service import LlmSettingsService

        runtime = LlmSettingsService(session).get_runtime_settings()
    else:
        runtime = LlmRuntimeSettings()

    provider = (runtime.provider or "openrouter").strip().lower()
    try:
        configured = resolve_llm_config(runtime) is not None
    except AppError:
        configured = False
    return provider, configured


def get_diarization_status(
    *,
    enabled: bool,
    hf_token: str | None,
    settings: Settings | None = None,
) -> tuple[bool, str | None]:
    settings = settings or get_settings()
    if not enabled:
        return True, None

    pyannote_installed = dependency_installed("pyannote.audio")
    diarization_reason: str | None = None

    if not hf_token:
        diarization_reason = (
            "Hugging Face token is not configured. Set HF_TOKEN in .env."
        )
    elif not pyannote_installed:
        diarization_reason = "pyannote-audio is not installed."
    else:
        access_ok, access_reason = get_cached_pipeline_access(
            settings.diarization_pipeline_id,
            hf_token,
        ) or (False, "Could not verify Hugging Face model access.")
        if not access_ok:
            diarization_reason = access_reason

    diarization_ready = bool(hf_token) and pyannote_installed and diarization_reason is None
    return diarization_ready, diarization_reason


def get_voiceprint_profiles_status_for_preferences(
    *,
    diarization_enabled: bool,
    voiceprint_profiles_enabled: bool,
    hf_token: str | None,
    settings: Settings | None = None,
) -> VoiceprintProfilesStatus:
    settings = settings or get_settings()
    pyannote_installed = dependency_installed("pyannote.audio")
    reason: str | None = None

    if not voiceprint_profiles_enabled:
        reason = "Voiceprint profiles are disabled in Settings."
    elif not diarization_enabled:
        reason = "Voiceprint profiles require speaker diarization to be enabled in Settings."
    elif not hf_token:
        reason = "Hugging Face token is not configured. Set HF_TOKEN in .env."
    elif not pyannote_installed:
        reason = "pyannote-audio is not installed."
    elif not dependency_installed("omegaconf"):
        reason = "omegaconf is not installed (required for speaker embeddings)."
    elif not dependency_installed("speechbrain"):
        reason = "speechbrain is not installed (required for speaker embeddings)."

    ready = reason is None
    return VoiceprintProfilesStatus(ready=ready, reason=reason)


def get_capability_status(
    settings: Settings | None = None,
    session=None,
) -> CapabilityStatus:
    settings = settings or get_settings()

    diarization_enabled = settings.diarization_enabled
    voiceprint_profiles_enabled = settings.voiceprint_profiles_enabled
    hf_token = resolve_hf_token(settings)
    if session is not None:
        from app.domains.settings.transcription_settings_service import TranscriptionSettingsService

        transcription_settings = TranscriptionSettingsService(session, settings)
        diarization_enabled = transcription_settings.is_diarization_enabled()
        voiceprint_profiles_enabled = transcription_settings.is_voiceprint_profiles_enabled()
        hf_token = transcription_settings.get_hf_token() or hf_token

    diarization_ready, diarization_reason = get_diarization_status(
        enabled=diarization_enabled,
        hf_token=hf_token,
        settings=settings,
    )
    profiles_status = get_voiceprint_profiles_status_for_preferences(
        diarization_enabled=diarization_enabled,
        voiceprint_profiles_enabled=voiceprint_profiles_enabled,
        hf_token=hf_token,
        settings=settings,
    )
    llm_provider, llm_configured = _get_llm_capability(settings, session)

    consent_given = False
    if session is not None:
        from app.domains.settings.app_preference_service import AppPreferenceService

        consent_given = AppPreferenceService(session).has_voiceprint_profiles_consent()

    return CapabilityStatus(
        diarization_enabled=diarization_enabled,
        diarization_ready=diarization_ready,
        diarization_reason=diarization_reason,
        llm_provider=llm_provider,
        llm_configured=llm_configured,
        openrouter_configured=llm_configured and llm_provider == "openrouter",
        voiceprint_profiles_enabled=voiceprint_profiles_enabled,
        voiceprint_profiles_ready=profiles_status.ready and voiceprint_profiles_enabled,
        voiceprint_profiles_reason=profiles_status.reason,
        voiceprint_profiles_consent_given=consent_given,
    )


def get_voiceprint_profiles_status(
    session=None,
    settings: Settings | None = None,
) -> VoiceprintProfilesStatus:
    settings = settings or get_settings()
    diarization_enabled = settings.diarization_enabled
    voiceprint_profiles_enabled = settings.voiceprint_profiles_enabled
    hf_token = resolve_hf_token(settings)

    if session is not None:
        from app.domains.settings.transcription_settings_service import TranscriptionSettingsService

        transcription_settings = TranscriptionSettingsService(session, settings)
        diarization_enabled = transcription_settings.is_diarization_enabled()
        voiceprint_profiles_enabled = transcription_settings.is_voiceprint_profiles_enabled()
        hf_token = transcription_settings.get_hf_token() or hf_token

    return get_voiceprint_profiles_status_for_preferences(
        diarization_enabled=diarization_enabled,
        voiceprint_profiles_enabled=voiceprint_profiles_enabled,
        hf_token=hf_token,
        settings=settings,
    )


