import importlib.util
import logging
import shutil
from dataclasses import dataclass
from pathlib import Path

from app.config import Settings, _ENV_CANDIDATES, get_settings
from app.core.errors import AppError
from app.services.diarization_service import (
    PYANOTE_COMMUNITY_MODEL_URL,
    get_cached_pipeline_access,
    resolve_hf_token,
)

logger = logging.getLogger(__name__)

BANNER = "=" * 72


@dataclass(frozen=True)
class DependencyStatus:
    name: str
    installed: bool
    required_for: str
    install_hint: str | None = None


@dataclass(frozen=True)
class CapabilityStatus:
    diarization_enabled: bool
    diarization_ready: bool
    diarization_reason: str | None
    llm_provider: str
    llm_configured: bool
    openrouter_configured: bool
    speaker_memory_enabled: bool
    speaker_memory_ready: bool
    speaker_memory_reason: str | None
    speaker_memory_consent_given: bool


@dataclass(frozen=True)
class SpeakerMemoryStatus:
    ready: bool
    reason: str | None


def _dependency_installed(module_name: str) -> bool:
    return importlib.util.find_spec(module_name) is not None


def check_dependencies() -> list[DependencyStatus]:
    return [
        DependencyStatus(
            name="ffmpeg",
            installed=shutil.which("ffmpeg") is not None,
            required_for="audio upload, normalization, and segment slicing",
            install_hint="brew install ffmpeg  (macOS)  or  apt install ffmpeg  (Linux)",
        ),
        DependencyStatus(
            name="torch",
            installed=_dependency_installed("torch"),
            required_for="local ASR transcription",
            install_hint="cd backend && uv add torch",
        ),
        DependencyStatus(
            name="qwen-asr",
            installed=_dependency_installed("qwen_asr"),
            required_for="local ASR transcription",
            install_hint="cd backend && uv add qwen-asr",
        ),
        DependencyStatus(
            name="pyannote-audio",
            installed=_dependency_installed("pyannote.audio"),
            required_for="speaker diarization and speaker memory",
            install_hint="cd backend && uv add pyannote-audio",
        ),
        DependencyStatus(
            name="omegaconf",
            installed=_dependency_installed("omegaconf"),
            required_for="speaker embedding model checkpoints",
            install_hint="cd backend && uv add omegaconf",
        ),
        DependencyStatus(
            name="speechbrain",
            installed=_dependency_installed("speechbrain"),
            required_for="speaker embedding model checkpoints",
            install_hint="cd backend && uv add speechbrain",
        ),
        DependencyStatus(
            name="httpx",
            installed=_dependency_installed("httpx"),
            required_for="LLM AI actions",
            install_hint="included with backend dependencies (uv sync)",
        ),
    ]


def _get_llm_capability(settings: Settings, session=None) -> tuple[str, bool]:
    from app.services.llm.config import resolve_llm_config
    from app.services.llm.runtime import LlmRuntimeSettings

    runtime: LlmRuntimeSettings
    if session is not None:
        from app.services.llm_settings_service import LlmSettingsService

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

    pyannote_installed = _dependency_installed("pyannote.audio")
    diarization_reason: str | None = None

    if not hf_token:
        diarization_reason = (
            "Hugging Face token is not configured. Add it in Settings → Transcription."
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


def get_speaker_memory_status_for_preferences(
    *,
    diarization_enabled: bool,
    speaker_memory_enabled: bool,
    hf_token: str | None,
    settings: Settings | None = None,
) -> SpeakerMemoryStatus:
    settings = settings or get_settings()
    pyannote_installed = _dependency_installed("pyannote.audio")
    reason: str | None = None

    if not speaker_memory_enabled:
        reason = "Voiceprint profiles are disabled in Settings."
    elif not diarization_enabled:
        reason = "Voiceprint profiles require speaker diarization to be enabled in Settings."
    elif not hf_token:
        reason = "Hugging Face token is not configured. Add it in Settings → Transcription."
    elif not pyannote_installed:
        reason = "pyannote-audio is not installed."
    elif not _dependency_installed("omegaconf"):
        reason = "omegaconf is not installed (required for speaker embeddings)."
    elif not _dependency_installed("speechbrain"):
        reason = "speechbrain is not installed (required for speaker embeddings)."

    ready = reason is None
    return SpeakerMemoryStatus(ready=ready, reason=reason)


def get_capability_status(
    settings: Settings | None = None,
    session=None,
) -> CapabilityStatus:
    settings = settings or get_settings()

    diarization_enabled = settings.diarization_enabled
    speaker_memory_enabled = settings.speaker_memory_enabled
    hf_token = resolve_hf_token(settings)
    speaker_auto_label = False

    if session is not None:
        from app.services.transcription_settings_service import TranscriptionSettingsService

        transcription_settings = TranscriptionSettingsService(session, settings)
        diarization_enabled = transcription_settings.is_diarization_enabled()
        speaker_memory_enabled = transcription_settings.is_speaker_memory_enabled()
        speaker_auto_label = transcription_settings.is_speaker_auto_label_enabled()
        hf_token = transcription_settings.get_hf_token() or hf_token

    diarization_ready, diarization_reason = get_diarization_status(
        enabled=diarization_enabled,
        hf_token=hf_token,
        settings=settings,
    )
    memory_status = get_speaker_memory_status_for_preferences(
        diarization_enabled=diarization_enabled,
        speaker_memory_enabled=speaker_memory_enabled,
        hf_token=hf_token,
        settings=settings,
    )
    llm_provider, llm_configured = _get_llm_capability(settings, session)

    consent_given = False
    if session is not None:
        from app.services.app_preference_service import AppPreferenceService

        consent_given = AppPreferenceService(session, settings).has_speaker_memory_consent()

    return CapabilityStatus(
        diarization_enabled=diarization_enabled,
        diarization_ready=diarization_ready,
        diarization_reason=diarization_reason,
        llm_provider=llm_provider,
        llm_configured=llm_configured,
        openrouter_configured=llm_configured and llm_provider == "openrouter",
        speaker_memory_enabled=speaker_auto_label,
        speaker_memory_ready=memory_status.ready and speaker_memory_enabled,
        speaker_memory_reason=memory_status.reason,
        speaker_memory_consent_given=consent_given,
    )


def get_speaker_memory_status(
    session=None,
    settings: Settings | None = None,
) -> SpeakerMemoryStatus:
    settings = settings or get_settings()
    diarization_enabled = settings.diarization_enabled
    speaker_memory_enabled = settings.speaker_memory_enabled
    hf_token = resolve_hf_token(settings)

    if session is not None:
        from app.services.transcription_settings_service import TranscriptionSettingsService

        transcription_settings = TranscriptionSettingsService(session, settings)
        diarization_enabled = transcription_settings.is_diarization_enabled()
        speaker_memory_enabled = transcription_settings.is_speaker_memory_enabled()
        hf_token = transcription_settings.get_hf_token() or hf_token

    return get_speaker_memory_status_for_preferences(
        diarization_enabled=diarization_enabled,
        speaker_memory_enabled=speaker_memory_enabled,
        hf_token=hf_token,
        settings=settings,
    )


def get_capability_status_with_session(
    session,
    settings: Settings | None = None,
) -> CapabilityStatus:
    return get_capability_status(settings, session)


def _loaded_env_files() -> list[str]:
    return [str(path) for path in _ENV_CANDIDATES if path.is_file()]


def _log_section(title: str) -> None:
    logger.info("")
    logger.info("--- %s ---", title)


def _log_bullet(message: str) -> None:
    logger.info("  %s", message)


def _log_action(message: str) -> None:
    logger.info("  → %s", message)


def log_startup_summary(settings: Settings | None = None) -> None:
    settings = settings or get_settings()
    dependencies = check_dependencies()

    from sqlmodel import Session

    from app.services.llm.config import resolve_llm_config
    from app.services.llm.presets import get_preset
    from app.services.llm_settings_service import LlmSettingsService
    from app.storage.database import get_engine

    with Session(get_engine()) as session:
        capabilities = get_capability_status(settings, session)
        runtime = LlmSettingsService(session).get_runtime_settings()

        logger.info(BANNER)
        logger.info("%s backend started (%s)", settings.app_name, settings.app_env)
        logger.info(BANNER)

        _log_section("Configuration files")
        env_files = _loaded_env_files()
        if env_files:
            for path in env_files:
                _log_bullet(f"Loaded: {path}")
        else:
            _log_bullet("No .env file found — using defaults and process environment variables.")
            _log_action("Copy backend/.env.example or .env.example to .env and customize.")

        _log_section("Storage")
        _log_bullet(f"Database: {settings.database_url}")
        _log_bullet(f"Data directory: {settings.data_dir}")
        _log_bullet(f"Audio (original): {settings.original_audio_dir}")
        _log_bullet(f"Audio (normalized): {settings.normalized_audio_dir}")

        _log_section("Transcription (ASR)")
        _log_bullet(f"Model: {settings.asr_model_id}")
        _log_bullet(f"Device: {settings.asr_device}")
        _log_bullet(f"Dtype: {settings.asr_dtype}")

        _log_section("Speaker diarization")
        if not settings.diarization_enabled:
            _log_bullet("Disabled (DIARIZATION_ENABLED=false) — transcripts will not include speaker labels.")
            _log_action("Enable: DIARIZATION_ENABLED=true in .env")
        else:
            _log_bullet("Enabled (DIARIZATION_ENABLED=true)")
            _log_bullet(f"Pipeline: {settings.diarization_pipeline_id}")
            _log_bullet(
                "Audio source: "
                + ("original upload" if settings.diarization_use_original_audio else "normalized 16 kHz WAV")
            )
            _log_bullet(
                "Segment mode: "
                + ("exclusive (recommended for ASR)" if settings.diarization_use_exclusive else "standard")
            )
            _log_bullet(
                f"Tuning: min_segment={settings.diarization_min_segment_seconds}s, "
                f"merge_gap={settings.diarization_merge_gap_seconds}s"
                + (
                    f", max_segments={settings.diarization_max_segments}"
                    if settings.diarization_max_segments > 0
                    else ""
                )
            )
            if capabilities.diarization_ready:
                _log_bullet("Status: READY — speaker labels will be applied during transcription.")
            else:
                _log_bullet("Status: NOT READY — diarization will be skipped; transcripts will have no speaker labels.")
                if capabilities.diarization_reason:
                    _log_bullet(f"Reason: {capabilities.diarization_reason}")
                _log_action(f"Open {PYANOTE_COMMUNITY_MODEL_URL} while logged into Hugging Face")
                _log_action("Click 'Agree and access repository' (same account as HF_TOKEN)")
                _log_action("Create a read token: https://huggingface.co/settings/tokens")
                _log_action("Set HF_TOKEN=hf_... in .env, restart backend, re-transcribe")
                _log_action("Install dependency: cd backend && uv add pyannote-audio")

        _log_section("Voiceprint profiles")
        if not settings.speaker_memory_enabled:
            _log_bullet("Disabled — configure in Settings → Transcription in the app.")
            _log_action("Enable voiceprint profiles in Settings → Transcription.")
        else:
            _log_bullet(f"Enabled — embedding model: {settings.speaker_embedding_model_id}")
            _log_bullet(f"Match threshold: {settings.speaker_match_threshold}")
            memory_status = get_speaker_memory_status(settings=settings)
            if memory_status.ready:
                _log_bullet("Status: READY — auto-match uses enrolled voiceprints when consent is given.")
            else:
                _log_bullet("Status: NOT READY")
                if memory_status.reason:
                    _log_bullet(f"Reason: {memory_status.reason}")

        _log_section("Transcript summarization (LLM)")
        provider = capabilities.llm_provider
        preset = get_preset(provider) if provider in {"openrouter", "openai", "anthropic", "custom"} else None
        display_name = preset.display_name if preset else provider

        _log_bullet(f"Provider: {display_name}")
        try:
            llm_config = resolve_llm_config(runtime)
            default_model = llm_config.default_model if llm_config else "not set"
        except AppError:
            default_model = "not set"
        _log_bullet(f"Default model: {default_model}")
        if capabilities.llm_configured:
            _log_bullet("LLM: configured (stored in local SQLite via Settings)")
        else:
            _log_bullet("LLM: NOT CONFIGURED")
            _log_action("Open Settings → LLM provider in the frontend and save provider + API key")

        _log_section("Dependencies")
        for dep in dependencies:
            status = "installed" if dep.installed else "MISSING"
            _log_bullet(f"{dep.name}: {status} — needed for {dep.required_for}")
            if not dep.installed and dep.install_hint:
                _log_action(dep.install_hint)

        _log_section("Documentation")
        repo_root = Path(__file__).resolve().parents[3]
        quickstart = repo_root / "docs" / "quickstart.md"
        diarization_doc = repo_root / "docs" / "diarization.md"
        env_example = repo_root / ".env.example"
        if quickstart.is_file():
            _log_bullet(f"Quickstart: {quickstart}")
        if diarization_doc.is_file():
            _log_bullet(f"Diarization guide: {diarization_doc}")
        speaker_memory_doc = repo_root / "docs" / "speaker-memory.md"
        if speaker_memory_doc.is_file():
            _log_bullet(f"Speaker memory guide: {speaker_memory_doc}")
        if env_example.is_file():
            _log_bullet(f"Environment reference: {env_example}")
        _log_bullet("Validate diarization: cd backend && uv run python scripts/validate_diarization.py")
        _log_bullet("Settings page in the frontend shows live capability status from /api/health.")

        logger.info(BANNER)


ERROR_GUIDANCE: dict[str, list[str]] = {
    "DIARIZATION_MODEL_LOAD_FAILED": [
        "Open https://huggingface.co/pyannote/speaker-diarization-community-1 while logged in",
        "Click 'Agree and access repository' (403 errors mean this step was skipped)",
        "Ensure HF_TOKEN in .env belongs to the SAME Hugging Face account",
        "Create a read token at https://huggingface.co/settings/tokens if needed",
        "Restart backend and re-transcribe audio",
    ],
    "DIARIZATION_FAILED": [
        "Check backend logs for the underlying pyannote/ffmpeg error",
        "Try DIARIZATION_USE_ORIGINAL_AUDIO=true if normalized audio quality is poor",
    ],
    "ASR_MODEL_LOAD_FAILED": [
        "Install ASR dependencies: uv add torch qwen-asr",
        "Ensure enough disk/RAM for the Qwen3-ASR model",
        "Set HF_HOME=./data/hf_cache in .env for model downloads",
    ],
    "ASR_TRANSCRIPTION_FAILED": [
        "Verify the normalized WAV exists under data/audio/normalized/",
        "Check ffmpeg is installed: brew install ffmpeg",
    ],
    "AUDIO_NORMALIZATION_FAILED": [
        "Install ffmpeg: brew install ffmpeg",
        "Confirm the uploaded file is a supported audio format (mp3, wav, m4a, webm, …)",
    ],
    "LLM_NOT_CONFIGURED": [
        "Open Settings → LLM provider in the frontend",
        "Choose a provider and save an API key (custom/local providers also need base URL and model)",
    ],
    "LLM_INVALID_PROVIDER": [
        "Choose a provider in Settings → LLM provider: openrouter, openai, anthropic, or custom",
    ],
    "SPEAKER_EMBEDDING_MODEL_LOAD_FAILED": [
        "Install embedding dependencies: cd backend && uv add omegaconf speechbrain",
        "Accept Hugging Face terms for https://huggingface.co/pyannote/embedding",
        "Ensure HF_TOKEN in .env matches the account that accepted model terms",
        "Restart backend after installing dependencies",
    ],
}


def log_error_guidance(code: str, message: str) -> None:
    logger.error("Operation failed [%s]: %s", code, message)
    steps = ERROR_GUIDANCE.get(code)
    if not steps:
        return
    logger.error("Suggested fixes:")
    for step in steps:
        logger.error("  → %s", step)


def log_transcription_pipeline(
    settings: Settings | None = None,
    *,
    session=None,
) -> None:
    settings = settings or get_settings()
    capabilities = get_capability_status(settings, session)

    if capabilities.diarization_enabled:
        if capabilities.diarization_ready:
            logger.info(
                "Transcription pipeline: diarization → per-speaker ASR → labeled transcript"
            )
        else:
            logger.warning(
                "Transcription pipeline: diarization NOT READY (%s) — will fall back to full-file ASR without speaker labels",
                capabilities.diarization_reason or "unknown",
            )
    else:
        logger.info("Transcription pipeline: full-file ASR (diarization disabled)")
