from fastapi import APIRouter, Depends, Form, UploadFile
from fastapi.responses import FileResponse

from app.api.deps import get_audio_service
from app.domains.media.audio_service import AudioService
from app.models.audio_asset import AudioAsset
from app.schemas.audio import AudioAssetResponse, OkResponse

router = APIRouter(prefix="/audio", tags=["audio"])


def _to_response(audio_asset: AudioAsset) -> AudioAssetResponse:
    return AudioAssetResponse.model_validate(audio_asset)


@router.post("/upload", response_model=AudioAssetResponse)
def upload_audio(
    file: UploadFile,
    source: str = Form(...),
    service: AudioService = Depends(get_audio_service),
) -> AudioAssetResponse:
    audio_asset = service.save_upload(file, source)
    return _to_response(audio_asset)


@router.get("/{audio_id}/stream")
def stream_audio(
    audio_id: str,
    service: AudioService = Depends(get_audio_service),
) -> FileResponse:
    audio_asset = service.get_audio(audio_id)
    path, media_type = service.get_playback_path(audio_asset)
    return FileResponse(path, media_type=media_type, filename=audio_asset.filename)


@router.get("/{audio_id}", response_model=AudioAssetResponse)
def get_audio(
    audio_id: str,
    service: AudioService = Depends(get_audio_service),
) -> AudioAssetResponse:
    return _to_response(service.get_audio(audio_id))


@router.delete("/{audio_id}", response_model=OkResponse)
def delete_audio(
    audio_id: str,
    service: AudioService = Depends(get_audio_service),
) -> OkResponse:
    audio_asset = service.get_audio(audio_id)
    service.delete_audio(audio_asset)
    return OkResponse()
