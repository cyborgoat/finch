from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.schemas.audio import OkResponse
from app.schemas.voiceprint import (
    CreateVoiceprintProfileRequest,
    EnrollVoiceprintProfileFromAudioRequest,
    EnrollVoiceprintProfileFromAudioResponse,
    VoiceprintProfilesConsentResponse,
    VoiceprintProfilesStatusResponse,
    VoiceprintProfilesToggleRequest,
    VoiceprintProfileDetailResponse,
    VoiceprintProfileListResponse,
    VoiceprintProfileResponse,
    VoiceprintProfileSummary,
    VoiceprintEmbeddingSummary,
    RelatedRecordingSummary,
    UpdateVoiceprintProfileRequest,
)
from app.schemas.user_settings import UpdateUserSettingsRequest
from app.services.app_preference_service import AppPreferenceService
from app.services.voiceprint_profile_service import VoiceprintProfileService
from app.services.user_settings_service import UserSettingsService
from app.storage.database import get_session

router = APIRouter(tags=["voiceprint-profiles"])


def _profile_summary(service: VoiceprintProfileService, profile) -> VoiceprintProfileSummary:
    return VoiceprintProfileSummary(
        id=profile.id,
        display_name=profile.display_name,
        notes=profile.notes,
        embedding_count=service.count_embeddings(profile.id),
        related_recording_count=service.count_related_recordings(profile.id),
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


def _voiceprint_profiles_status(session: Session) -> VoiceprintProfilesStatusResponse:
    from app.config import get_settings
    from app.services.transcription_settings_service import TranscriptionSettingsService

    settings = get_settings()
    preference_service = AppPreferenceService(session, settings)
    profile_service = VoiceprintProfileService(session, settings)
    transcription = TranscriptionSettingsService(session, settings).get_settings()
    consent_at = preference_service.get_voiceprint_profiles_consent_at()
    return VoiceprintProfilesStatusResponse(
        enabled=preference_service.is_voiceprint_auto_label_enabled(),
        consent_given=preference_service.has_voiceprint_profiles_consent(),
        consent_at=consent_at,
        profile_count=profile_service.count_profiles(),
        ready=transcription.voiceprint_profiles_ready,
        reason=transcription.voiceprint_profiles_reason,
    )


@router.get("/voiceprint-profiles", response_model=VoiceprintProfileListResponse)
def list_voiceprint_profiles(session: Session = Depends(get_session)) -> VoiceprintProfileListResponse:
    service = VoiceprintProfileService(session)
    items = [_profile_summary(service, profile) for profile in service.list_profiles()]
    return VoiceprintProfileListResponse(items=items)


@router.post("/voiceprint-profiles", response_model=VoiceprintProfileResponse)
def create_voiceprint_profile(
    payload: CreateVoiceprintProfileRequest,
    session: Session = Depends(get_session),
) -> VoiceprintProfileResponse:
    service = VoiceprintProfileService(session)
    profile = service.create_profile(payload.display_name, payload.notes)
    return VoiceprintProfileResponse(
        id=profile.id,
        display_name=profile.display_name,
        notes=profile.notes,
        embedding_count=0,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.post(
    "/voiceprint-profiles/enroll-sample",
    response_model=EnrollVoiceprintProfileFromAudioResponse,
)
def enroll_voiceprint_profile_from_audio(
    payload: EnrollVoiceprintProfileFromAudioRequest,
    session: Session = Depends(get_session),
) -> EnrollVoiceprintProfileFromAudioResponse:
    service = VoiceprintProfileService(session)
    profile = service.enroll_from_audio_asset(
        payload.audio_asset_id,
        payload.display_name.strip(),
        profile_id=payload.profile_id,
    )
    user_voiceprint_profile_id = None
    if payload.set_as_user_profile:
        user_settings = UserSettingsService(session)
        user_settings.update_settings(
            UpdateUserSettingsRequest(user_voiceprint_profile_id=profile.id),
        )
        user_voiceprint_profile_id = profile.id
    return EnrollVoiceprintProfileFromAudioResponse(
        profile=VoiceprintProfileResponse(
            id=profile.id,
            display_name=profile.display_name,
            notes=profile.notes,
            embedding_count=service.count_embeddings(profile.id),
            created_at=profile.created_at,
            updated_at=profile.updated_at,
        ),
        user_voiceprint_profile_id=user_voiceprint_profile_id,
    )


@router.get("/voiceprint-profiles/status", response_model=VoiceprintProfilesStatusResponse)
def get_voiceprint_profiles_status(
    session: Session = Depends(get_session),
) -> VoiceprintProfilesStatusResponse:
    return _voiceprint_profiles_status(session)


@router.post("/voiceprint-profiles/consent", response_model=VoiceprintProfilesConsentResponse)
def record_voiceprint_profiles_consent(
    session: Session = Depends(get_session),
) -> VoiceprintProfilesConsentResponse:
    preference_service = AppPreferenceService(session)
    consent_at = preference_service.record_voiceprint_profiles_consent()
    return VoiceprintProfilesConsentResponse(consent_at=consent_at)


@router.patch("/voiceprint-profiles/status", response_model=VoiceprintProfilesStatusResponse)
def toggle_voiceprint_profiles(
    payload: VoiceprintProfilesToggleRequest,
    session: Session = Depends(get_session),
) -> VoiceprintProfilesStatusResponse:
    preference_service = AppPreferenceService(session)
    preference_service.set_voiceprint_auto_label_enabled(payload.enabled)
    return _voiceprint_profiles_status(session)


@router.delete("/voiceprint-profiles/data", response_model=OkResponse)
def delete_voiceprint_profiles_data(session: Session = Depends(get_session)) -> OkResponse:
    service = VoiceprintProfileService(session)
    service.delete_all_data()
    UserSettingsService(session).clear_user_voiceprint_profile_if_set()
    return OkResponse()


@router.get("/voiceprint-profiles/{profile_id}", response_model=VoiceprintProfileDetailResponse)
def get_voiceprint_profile(
    profile_id: str,
    session: Session = Depends(get_session),
) -> VoiceprintProfileDetailResponse:
    service = VoiceprintProfileService(session)
    detail = service.get_profile_detail(profile_id)
    profile = detail["profile"]
    return VoiceprintProfileDetailResponse(
        id=profile.id,
        display_name=profile.display_name,
        notes=profile.notes,
        embedding_count=len(detail["embeddings"]),
        embedding_description=detail["embedding_description"],
        embeddings=[VoiceprintEmbeddingSummary.model_validate(item) for item in detail["embeddings"]],
        related_recordings=[
            RelatedRecordingSummary.model_validate(item)
            for item in detail["related_recordings"]
        ],
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.patch("/voiceprint-profiles/{profile_id}", response_model=VoiceprintProfileResponse)
def update_voiceprint_profile(
    profile_id: str,
    payload: UpdateVoiceprintProfileRequest,
    session: Session = Depends(get_session),
) -> VoiceprintProfileResponse:
    service = VoiceprintProfileService(session)
    profile = service.get_profile(profile_id)
    updated = service.update_profile(
        profile,
        display_name=payload.display_name,
        notes=payload.notes,
    )
    return VoiceprintProfileResponse(
        id=updated.id,
        display_name=updated.display_name,
        notes=updated.notes,
        embedding_count=service.count_embeddings(updated.id),
        created_at=updated.created_at,
        updated_at=updated.updated_at,
    )


@router.delete("/voiceprint-profiles/{profile_id}", response_model=OkResponse)
def delete_voiceprint_profile(
    profile_id: str,
    session: Session = Depends(get_session),
) -> OkResponse:
    service = VoiceprintProfileService(session)
    profile = service.get_profile(profile_id)
    service.delete_profile(profile)
    UserSettingsService(session).clear_user_voiceprint_profile(profile_id)
    return OkResponse()
