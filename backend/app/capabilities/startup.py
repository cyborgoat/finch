import logging
from pathlib import Path

from app.capabilities.checker import check_dependencies
from app.capabilities.status import (
    get_capability_status,
    get_voiceprint_profiles_status,
)
from app.config import _ENV_CANDIDATES, Settings, get_settings
from app.core.errors import AppError
from app.domains.transcription.diarization_service import pyannote_community_model_url

logger = logging.getLogger(__name__)

BANNER = "=" * 72


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

    from app.domains.ai.llm.config import resolve_llm_config
    from app.domains.ai.llm.presets import get_preset
    from app.domains.settings.llm_settings_service import LlmSettingsService
    from app.storage.database import get_engine

    with Session(get_engine()) as session:
        capabilities = get_capability_status(settings, session)
        runtime = LlmSettingsService(session).get_runtime_settings()

        logger.info(BANNER)
        logger.info("%s backend started (%s)", settings.app_name, settings.app_env)
        if settings.debug_mode:
            _log_bullet("Debug mode: ON (verbose voiceprint/diarization logs at DEBUG level)")
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
            _log_bullet(
                "Disabled (DIARIZATION_ENABLED=false) — "
                "transcripts will not include speaker labels."
            )
            _log_action("Enable: DIARIZATION_ENABLED=true in .env")
        else:
            _log_bullet("Enabled (DIARIZATION_ENABLED=true)")
            _log_bullet(f"Pipeline: {settings.diarization_pipeline_id}")
            audio_source = (
                "original upload"
                if settings.diarization_use_original_audio
                else "normalized 16 kHz WAV"
            )
            _log_bullet(f"Audio source: {audio_source}")
            segment_mode = (
                "exclusive (recommended for ASR)"
                if settings.diarization_use_exclusive
                else "standard"
            )
            _log_bullet(f"Segment mode: {segment_mode}")
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
                _log_bullet(
                    "Status: NOT READY — diarization will be skipped; "
                    "transcripts will have no speaker labels."
                )
                if capabilities.diarization_reason:
                    _log_bullet(f"Reason: {capabilities.diarization_reason}")
                _log_action(
                    f"Open {pyannote_community_model_url(settings)} while logged into Hugging Face"
                )
                _log_action("Click 'Agree and access repository' (same account as HF_TOKEN)")
                _log_action("Create a read token: https://huggingface.co/settings/tokens")
                _log_action("Set HF_TOKEN=hf_... in .env, restart backend, re-transcribe")
                _log_action("Install dependency: cd backend && uv add pyannote-audio")

        _log_section("Voiceprint profiles")
        if not settings.voiceprint_profiles_enabled:
            _log_bullet("Disabled — configure in Settings → Transcription in the app.")
            _log_action("Enable voiceprint profiles in Settings → Transcription.")
        else:
            _log_bullet(f"Enabled — embedding model: {settings.speaker_embedding_model_id}")
            _log_bullet(f"Match threshold: {settings.speaker_match_threshold}")
            profiles_status = get_voiceprint_profiles_status(settings=settings)
            if profiles_status.ready:
                _log_bullet(
                    "Status: READY — auto-match uses enrolled voiceprints "
                    "when consent is given."
                )
            else:
                _log_bullet("Status: NOT READY")
                if profiles_status.reason:
                    _log_bullet(f"Reason: {profiles_status.reason}")

        _log_section("Transcript summarization (LLM)")
        provider = capabilities.llm_provider
        llm_providers = {"openrouter", "openai", "anthropic", "custom"}
        preset = get_preset(provider) if provider in llm_providers else None
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
        voiceprint_profiles_doc = repo_root / "docs" / "voiceprint-profiles.md"
        if voiceprint_profiles_doc.is_file():
            _log_bullet(f"Voiceprint profiles guide: {voiceprint_profiles_doc}")
        if env_example.is_file():
            _log_bullet(f"Environment reference: {env_example}")
        _log_bullet(
            "Validate diarization: cd backend && "
            "uv run python scripts/validate_diarization.py"
        )
        _log_bullet("Settings page in the frontend shows live capability status from /api/health.")

        logger.info(BANNER)


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
                "Transcription pipeline: diarization NOT READY (%s) — "
                "will fall back to full-file ASR without speaker labels",
                capabilities.diarization_reason or "unknown",
            )
    else:
        logger.info("Transcription pipeline: full-file ASR (diarization disabled)")
