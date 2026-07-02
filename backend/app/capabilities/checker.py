import importlib.util
import shutil
from dataclasses import dataclass


@dataclass(frozen=True)
class DependencyStatus:
    name: str
    installed: bool
    required_for: str
    install_hint: str | None = None


def dependency_installed(module_name: str) -> bool:
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
            installed=dependency_installed("torch"),
            required_for="local ASR transcription",
            install_hint="cd backend && uv add torch",
        ),
        DependencyStatus(
            name="qwen-asr",
            installed=dependency_installed("qwen_asr"),
            required_for="local ASR transcription",
            install_hint="cd backend && uv add qwen-asr",
        ),
        DependencyStatus(
            name="pyannote-audio",
            installed=dependency_installed("pyannote.audio"),
            required_for="speaker diarization and voiceprint profiles",
            install_hint="cd backend && uv add pyannote-audio",
        ),
        DependencyStatus(
            name="omegaconf",
            installed=dependency_installed("omegaconf"),
            required_for="speaker embedding model checkpoints",
            install_hint="cd backend && uv add omegaconf",
        ),
        DependencyStatus(
            name="speechbrain",
            installed=dependency_installed("speechbrain"),
            required_for="speaker embedding model checkpoints",
            install_hint="cd backend && uv add speechbrain",
        ),
        DependencyStatus(
            name="httpx",
            installed=dependency_installed("httpx"),
            required_for="LLM AI actions",
            install_hint="included with backend dependencies (uv sync)",
        ),
    ]
