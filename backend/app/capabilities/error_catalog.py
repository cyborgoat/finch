import logging

logger = logging.getLogger(__name__)

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
        "Choose a provider and save an API key "
        "(custom/local providers also need base URL and model)",
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
