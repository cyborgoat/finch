import importlib.util
import logging
import shutil
from dataclasses import dataclass
from pathlib import Path

from app.config import Settings, _ENV_CANDIDATES, get_settings
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
    diarization_mock: bool
    diarization_ready: bool
    diarization_reason: str | None
    asr_mock: bool
    llm_mock: bool
    openrouter_configured: bool


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
            required_for="real ASR when ASR_MOCK=false",
            install_hint="cd backend && uv add torch",
        ),
        DependencyStatus(
            name="qwen-asr",
            installed=_dependency_installed("qwen_asr"),
            required_for="real ASR when ASR_MOCK=false",
            install_hint="cd backend && uv add qwen-asr",
        ),
        DependencyStatus(
            name="pyannote-audio",
            installed=_dependency_installed("pyannote.audio"),
            required_for="speaker diarization when DIARIZATION_MOCK=false",
            install_hint="cd backend && uv add pyannote-audio",
        ),
        DependencyStatus(
            name="httpx",
            installed=_dependency_installed("httpx"),
            required_for="OpenRouter AI actions when LLM_MOCK=false",
            install_hint="included with backend dependencies (uv sync)",
        ),
    ]


def get_capability_status(settings: Settings | None = None) -> CapabilityStatus:
    settings = settings or get_settings()
    hf_token = resolve_hf_token(settings)
    pyannote_installed = _dependency_installed("pyannote.audio")
    diarization_reason: str | None = None

    if settings.diarization_enabled and not settings.diarization_mock:
        if not hf_token:
            diarization_reason = (
                "HF_TOKEN is not set and no Hugging Face CLI login was found."
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

    diarization_ready = (
        not settings.diarization_enabled
        or settings.diarization_mock
        or (bool(hf_token) and pyannote_installed and diarization_reason is None)
    )

    return CapabilityStatus(
        diarization_enabled=settings.diarization_enabled,
        diarization_mock=settings.diarization_mock,
        diarization_ready=diarization_ready,
        diarization_reason=diarization_reason,
        asr_mock=settings.asr_mock,
        llm_mock=settings.llm_mock,
        openrouter_configured=bool(settings.openrouter_api_key),
    )


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
    capabilities = get_capability_status(settings)
    dependencies = check_dependencies()

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
    if settings.asr_mock:
        _log_bullet("Mode: mock (ASR_MOCK=true) — returns placeholder text, no model download.")
        _log_action("For real transcription: set ASR_MOCK=false in .env and install torch + qwen-asr.")
    else:
        _log_bullet("Mode: real (ASR_MOCK=false)")
        _log_bullet(f"Model: {settings.asr_model_id}")
        _log_bullet(f"Device: {settings.asr_device}")
        _log_bullet(f"Dtype: {settings.asr_dtype}")

    _log_section("Speaker diarization")
    if not settings.diarization_enabled:
        _log_bullet("Disabled (DIARIZATION_ENABLED=false) — transcripts will not include speaker labels.")
        _log_action("Enable: DIARIZATION_ENABLED=true in .env")
    elif settings.diarization_mock:
        _log_bullet("Enabled in mock mode (DIARIZATION_MOCK=true) — uses two fake speaker segments for testing.")
        _log_action("For real diarization: DIARIZATION_MOCK=false and configure HF_TOKEN.")
    else:
        _log_bullet("Enabled (DIARIZATION_ENABLED=true, DIARIZATION_MOCK=false)")
        _log_bullet(f"Pipeline: {settings.diarization_pipeline_id}")
        _log_bullet(
            "Audio source: "
            + ("original upload" if settings.diarization_use_original_audio else "normalized 16 kHz WAV")
        )
        _log_bullet(
            "Segment mode: "
            + ("exclusive (recommended for ASR)" if settings.diarization_use_exclusive else "standard")
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

    _log_section("AI actions (LLM)")
    if settings.llm_mock:
        _log_bullet("Mode: mock (LLM_MOCK=true) — AI actions return sample Markdown.")
        _log_action("For real LLM output: set LLM_MOCK=false and OPENROUTER_API_KEY in .env.")
    else:
        _log_bullet("Mode: real (LLM_MOCK=false)")
        _log_bullet(f"Default model: {settings.openrouter_default_model}")
        if capabilities.openrouter_configured:
            _log_bullet("OpenRouter API key: configured")
        else:
            _log_bullet("OpenRouter API key: NOT SET")
            _log_action("Set OPENROUTER_API_KEY in .env")

    _log_section("Dependencies")
    for dep in dependencies:
        status = "installed" if dep.installed else "MISSING"
        _log_bullet(f"{dep.name}: {status} — needed for {dep.required_for}")
        if not dep.installed and dep.install_hint:
            _log_action(dep.install_hint)

    _log_section("Documentation")
    repo_root = Path(__file__).resolve().parents[3]
    quickstart = repo_root / "docs" / "quickstart.md"
    env_example = repo_root / ".env.example"
    if quickstart.is_file():
        _log_bullet(f"Quickstart: {quickstart}")
    if env_example.is_file():
        _log_bullet(f"Environment reference: {env_example}")
    _log_bullet("Settings page in the frontend shows live diarization/ASR status from /api/health.")

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
        "Set ASR_MOCK=false only after installing: uv add torch qwen-asr",
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
        "Set OPENROUTER_API_KEY in .env",
        "Or use LLM_MOCK=true for development without API calls",
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


def log_transcription_pipeline(settings: Settings | None = None) -> None:
    settings = settings or get_settings()
    capabilities = get_capability_status(settings)

    if settings.diarization_enabled and not settings.diarization_mock:
        if capabilities.diarization_ready:
            logger.info(
                "Transcription pipeline: diarization → per-speaker ASR → labeled transcript"
            )
        else:
            logger.warning(
                "Transcription pipeline: diarization NOT READY (%s) — will fall back to full-file ASR without speaker labels",
                capabilities.diarization_reason or "unknown",
            )
    elif settings.diarization_enabled and settings.diarization_mock:
        logger.info(
            "Transcription pipeline: mock diarization (2 speakers) → per-segment ASR"
        )
    else:
        logger.info("Transcription pipeline: full-file ASR (diarization disabled)")
