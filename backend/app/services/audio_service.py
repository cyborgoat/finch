import mimetypes
import subprocess
from pathlib import Path

import librosa
from fastapi import UploadFile
from sqlmodel import Session

from app.config import Settings, get_settings
from app.core.errors import AppError
from app.core.ids import generate_audio_id
from app.models.audio_asset import AudioAsset
from app.storage.file_store import safe_join

SUPPORTED_MIME_TYPES = {
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/m4a",
    "audio/webm",
    "audio/ogg",
    "audio/flac",
}

EXTENSION_BY_MIME = {
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/mp4": ".m4a",
    "audio/m4a": ".m4a",
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/flac": ".flac",
}

EXTENSION_TO_MIME = {
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/m4a",
    ".mp4": "audio/mp4",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
}


def normalize_mime_type(mime_type: str) -> str:
    """Strip codec/parameters (e.g. audio/webm;codecs=opus → audio/webm)."""
    return mime_type.split(";", 1)[0].strip().lower()


def resolve_mime_type(content_type: str | None, filename: str | None) -> str:
    mime_type = normalize_mime_type(content_type or "")
    if mime_type in SUPPORTED_MIME_TYPES:
        return mime_type

    guessed = mimetypes.guess_type(filename or "")[0]
    if guessed:
        normalized_guess = normalize_mime_type(guessed)
        if normalized_guess in SUPPORTED_MIME_TYPES:
            return normalized_guess

    extension = Path(filename or "").suffix.lower()
    return EXTENSION_TO_MIME.get(extension, mime_type)


class AudioService:
    def __init__(self, session: Session, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or get_settings()

    def save_upload(self, file: UploadFile, source: str) -> AudioAsset:
        if source not in {"upload", "recording"}:
            raise AppError("AUDIO_UNSUPPORTED_TYPE", "Invalid audio source.", 400)

        content = file.file.read()
        if not content:
            raise AppError("AUDIO_UNSUPPORTED_TYPE", "Uploaded file is empty.", 400)

        max_bytes = self.settings.max_upload_mb * 1024 * 1024
        if len(content) > max_bytes:
            raise AppError(
                "AUDIO_FILE_TOO_LARGE",
                f"File exceeds maximum size of {self.settings.max_upload_mb} MB.",
                413,
            )

        mime_type = resolve_mime_type(file.content_type, file.filename)
        if mime_type not in SUPPORTED_MIME_TYPES:
            raise AppError(
                "AUDIO_UNSUPPORTED_TYPE",
                f"Unsupported audio type: {mime_type or 'unknown'}.",
                400,
            )

        audio_id = generate_audio_id()
        extension = EXTENSION_BY_MIME.get(mime_type, Path(file.filename or "").suffix or ".bin")
        filename = f"{audio_id}{extension}"
        original_path = safe_join(self.settings.original_audio_dir, filename)
        original_path.write_bytes(content)

        audio_asset = AudioAsset(
            id=audio_id,
            source=source,
            filename=file.filename or filename,
            mime_type=mime_type,
            size_bytes=len(content),
            original_path=str(original_path),
        )
        self.session.add(audio_asset)
        self.session.commit()
        self.session.refresh(audio_asset)

        return self.normalize_audio(audio_asset)

    def normalize_audio(self, audio_asset: AudioAsset) -> AudioAsset:
        normalized_filename = f"{audio_asset.id}.wav"
        normalized_path = safe_join(self.settings.normalized_audio_dir, normalized_filename)

        try:
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    audio_asset.original_path,
                    "-ar",
                    "16000",
                    "-ac",
                    "1",
                    "-c:a",
                    "pcm_s16le",
                    str(normalized_path),
                ],
                check=True,
                capture_output=True,
            )
        except FileNotFoundError as exc:
            raise AppError(
                "AUDIO_NORMALIZATION_FAILED",
                "ffmpeg is not installed or not available on PATH.",
                500,
            ) from exc
        except subprocess.CalledProcessError as exc:
            raise AppError(
                "AUDIO_NORMALIZATION_FAILED",
                "Could not normalize audio file.",
                500,
            ) from exc

        duration = self.get_duration(str(normalized_path))
        if duration is not None and duration > self.settings.max_audio_duration_seconds:
            normalized_path.unlink(missing_ok=True)
            raise AppError(
                "AUDIO_DURATION_TOO_LONG",
                (
                    "Audio duration exceeds maximum of "
                    f"{self.settings.max_audio_duration_seconds} seconds."
                ),
                400,
            )

        audio_asset.normalized_path = str(normalized_path)
        audio_asset.duration_seconds = duration
        self.session.add(audio_asset)
        self.session.commit()
        self.session.refresh(audio_asset)
        return audio_asset

    def get_duration(self, path: str) -> float | None:
        try:
            return float(librosa.get_duration(path=path))
        except Exception:
            return None

    def get_audio(self, audio_id: str) -> AudioAsset:
        audio_asset = self.session.get(AudioAsset, audio_id)
        if audio_asset is None:
            raise AppError("AUDIO_NOT_FOUND", "Audio asset not found.", 404)
        return audio_asset

    def delete_audio(self, audio_asset: AudioAsset) -> None:
        Path(audio_asset.original_path).unlink(missing_ok=True)
        if audio_asset.normalized_path:
            Path(audio_asset.normalized_path).unlink(missing_ok=True)
        self.session.delete(audio_asset)
        self.session.commit()
