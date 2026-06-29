from fastapi import APIRouter, Depends, Form, UploadFile
from sqlmodel import Session

from app.models.audio_asset import AudioAsset
from app.schemas.audio import AudioAssetResponse, OkResponse
from app.services.audio_service import AudioService
from app.storage.database import get_session

router = APIRouter(prefix="/audio", tags=["audio"])


def _to_response(audio_asset: AudioAsset) -> AudioAssetResponse:
    return AudioAssetResponse.model_validate(audio_asset)


@router.post("/upload", response_model=AudioAssetResponse)
def upload_audio(
    file: UploadFile,
    source: str = Form(...),
    session: Session = Depends(get_session),
) -> AudioAssetResponse:
    service = AudioService(session)
    audio_asset = service.save_upload(file, source)
    return _to_response(audio_asset)


@router.get("/{audio_id}", response_model=AudioAssetResponse)
def get_audio(
    audio_id: str,
    session: Session = Depends(get_session),
) -> AudioAssetResponse:
    service = AudioService(session)
    return _to_response(service.get_audio(audio_id))


@router.delete("/{audio_id}", response_model=OkResponse)
def delete_audio(
    audio_id: str,
    session: Session = Depends(get_session),
) -> OkResponse:
    service = AudioService(session)
    audio_asset = service.get_audio(audio_id)
    service.delete_audio(audio_asset)
    return OkResponse()
