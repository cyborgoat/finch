from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.schemas.audio import OkResponse
from app.schemas.speaker import (
    CreateSpeakerProfileRequest,
    SpeakerMemoryConsentResponse,
    SpeakerMemoryStatusResponse,
    SpeakerMemoryToggleRequest,
    SpeakerProfileDetailResponse,
    SpeakerProfileListResponse,
    SpeakerProfileResponse,
    SpeakerProfileSummary,
    SpeakerEmbeddingSummary,
    RelatedTranscriptSummary,
    UpdateSpeakerProfileRequest,
)
from app.services.app_preference_service import AppPreferenceService
from app.services.speaker_profile_service import SpeakerProfileService
from app.storage.database import get_session

router = APIRouter(tags=["speaker-profiles"])


def _profile_summary(service: SpeakerProfileService, profile) -> SpeakerProfileSummary:
    return SpeakerProfileSummary(
        id=profile.id,
        display_name=profile.display_name,
        notes=profile.notes,
        embedding_count=service.count_embeddings(profile.id),
        related_transcript_count=service.count_related_transcripts(profile.id),
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


def _memory_status(session: Session) -> SpeakerMemoryStatusResponse:
    from app.config import get_settings
    from app.core.startup_diagnostics import get_speaker_memory_status

    settings = get_settings()
    preference_service = AppPreferenceService(session, settings)
    profile_service = SpeakerProfileService(session, settings)
    status = get_speaker_memory_status(session, settings)
    consent_at = preference_service.get_speaker_memory_consent_at()
    return SpeakerMemoryStatusResponse(
        enabled=preference_service.is_speaker_memory_enabled(),
        consent_given=preference_service.has_speaker_memory_consent(),
        consent_at=consent_at,
        profile_count=profile_service.count_profiles(),
        ready=status.ready,
        reason=status.reason,
    )


@router.get("/speaker-profiles", response_model=SpeakerProfileListResponse)
def list_speaker_profiles(session: Session = Depends(get_session)) -> SpeakerProfileListResponse:
    service = SpeakerProfileService(session)
    items = [_profile_summary(service, profile) for profile in service.list_profiles()]
    return SpeakerProfileListResponse(items=items)


@router.post("/speaker-profiles", response_model=SpeakerProfileResponse)
def create_speaker_profile(
    payload: CreateSpeakerProfileRequest,
    session: Session = Depends(get_session),
) -> SpeakerProfileResponse:
    service = SpeakerProfileService(session)
    profile = service.create_profile(payload.display_name, payload.notes)
    return SpeakerProfileResponse(
        id=profile.id,
        display_name=profile.display_name,
        notes=profile.notes,
        embedding_count=0,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.get("/speaker-profiles/{profile_id}", response_model=SpeakerProfileDetailResponse)
def get_speaker_profile(
    profile_id: str,
    session: Session = Depends(get_session),
) -> SpeakerProfileDetailResponse:
    service = SpeakerProfileService(session)
    detail = service.get_profile_detail(profile_id)
    profile = detail["profile"]
    return SpeakerProfileDetailResponse(
        id=profile.id,
        display_name=profile.display_name,
        notes=profile.notes,
        embedding_count=len(detail["embeddings"]),
        embedding_description=detail["embedding_description"],
        embeddings=[SpeakerEmbeddingSummary.model_validate(item) for item in detail["embeddings"]],
        related_transcripts=[
            RelatedTranscriptSummary.model_validate(item)
            for item in detail["related_transcripts"]
        ],
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.patch("/speaker-profiles/{profile_id}", response_model=SpeakerProfileResponse)
def update_speaker_profile(
    profile_id: str,
    payload: UpdateSpeakerProfileRequest,
    session: Session = Depends(get_session),
) -> SpeakerProfileResponse:
    service = SpeakerProfileService(session)
    profile = service.get_profile(profile_id)
    updated = service.update_profile(
        profile,
        display_name=payload.display_name,
        notes=payload.notes,
    )
    return SpeakerProfileResponse(
        id=updated.id,
        display_name=updated.display_name,
        notes=updated.notes,
        embedding_count=service.count_embeddings(updated.id),
        created_at=updated.created_at,
        updated_at=updated.updated_at,
    )


@router.delete("/speaker-profiles/{profile_id}", response_model=OkResponse)
def delete_speaker_profile(
    profile_id: str,
    session: Session = Depends(get_session),
) -> OkResponse:
    service = SpeakerProfileService(session)
    profile = service.get_profile(profile_id)
    service.delete_profile(profile)
    return OkResponse()


@router.get("/speaker-memory/status", response_model=SpeakerMemoryStatusResponse)
def get_speaker_memory_status(
    session: Session = Depends(get_session),
) -> SpeakerMemoryStatusResponse:
    return _memory_status(session)


@router.post("/speaker-memory/consent", response_model=SpeakerMemoryConsentResponse)
def record_speaker_memory_consent(
    session: Session = Depends(get_session),
) -> SpeakerMemoryConsentResponse:
    preference_service = AppPreferenceService(session)
    consent_at = preference_service.record_speaker_memory_consent()
    return SpeakerMemoryConsentResponse(consent_at=consent_at)


@router.patch("/speaker-memory/status", response_model=SpeakerMemoryStatusResponse)
def toggle_speaker_memory(
    payload: SpeakerMemoryToggleRequest,
    session: Session = Depends(get_session),
) -> SpeakerMemoryStatusResponse:
    preference_service = AppPreferenceService(session)
    preference_service.set_speaker_memory_enabled(payload.enabled)
    return _memory_status(session)


@router.delete("/speaker-memory/data", response_model=OkResponse)
def delete_speaker_memory_data(session: Session = Depends(get_session)) -> OkResponse:
    service = SpeakerProfileService(session)
    service.delete_all_data()
    return OkResponse()
