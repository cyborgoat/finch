from fastapi import APIRouter, Depends

from app.api.deps import (
    get_app_preference_service,
    get_transcription_settings_service,
    get_user_settings_service,
    get_voiceprint_profile_service,
)
from app.domains.settings.app_preference_service import AppPreferenceService
from app.domains.settings.transcription_settings_service import TranscriptionSettingsService
from app.domains.settings.user_settings_service import UserSettingsService
from app.domains.voiceprint.profile_service import VoiceprintProfileService
from app.schemas.audio import OkResponse
from app.schemas.transcription_settings import UpdateTranscriptionSettingsRequest
from app.schemas.user_settings import UpdateUserSettingsRequest
from app.schemas.voiceprint import (
    CreateVoiceprintProfileRequest,
    EnrollVoiceprintProfileFromAudioRequest,
    EnrollVoiceprintProfileFromAudioResponse,
    RelatedRecordingSummary,
    UpdateVoiceprintProfileRequest,
    VoiceprintEmbeddingSummary,
    VoiceprintProfileDetailResponse,
    VoiceprintProfileListResponse,
    VoiceprintProfileResponse,
    VoiceprintProfilesConsentResponse,
    VoiceprintProfilesStatusResponse,
    VoiceprintProfilesToggleRequest,
    VoiceprintProfileSummary,
)

router = APIRouter(prefix="/voiceprint-profiles", tags=["voiceprint-profiles"])


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


def _voiceprint_profiles_status(
    preference_service: AppPreferenceService,
    profile_service: VoiceprintProfileService,
    transcription_service: TranscriptionSettingsService,
) -> VoiceprintProfilesStatusResponse:
    transcription = transcription_service.get_settings()
    consent_at = preference_service.get_voiceprint_profiles_consent_at()
    return VoiceprintProfilesStatusResponse(
        enabled=transcription.voiceprint_auto_label_enabled,
        consent_given=preference_service.has_voiceprint_profiles_consent(),
        consent_at=consent_at,
        profile_count=profile_service.count_profiles(),
        ready=transcription.voiceprint_profiles_ready,
        reason=transcription.voiceprint_profiles_reason,
    )


@router.get("", response_model=VoiceprintProfileListResponse)
def list_voiceprint_profiles(
    service: VoiceprintProfileService = Depends(get_voiceprint_profile_service),
) -> VoiceprintProfileListResponse:
    items = [_profile_summary(service, profile) for profile in service.list_profiles()]
    return VoiceprintProfileListResponse(items=items)


@router.post("", response_model=VoiceprintProfileResponse)
def create_voiceprint_profile(
    payload: CreateVoiceprintProfileRequest,
    service: VoiceprintProfileService = Depends(get_voiceprint_profile_service),
) -> VoiceprintProfileResponse:
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
    "/enroll-sample",
    response_model=EnrollVoiceprintProfileFromAudioResponse,
)
def enroll_voiceprint_profile_from_audio(
    payload: EnrollVoiceprintProfileFromAudioRequest,
    service: VoiceprintProfileService = Depends(get_voiceprint_profile_service),
    user_settings: UserSettingsService = Depends(get_user_settings_service),
) -> EnrollVoiceprintProfileFromAudioResponse:
    profile = service.enroll_from_audio_asset(
        payload.audio_asset_id,
        payload.display_name.strip(),
        profile_id=payload.profile_id,
    )
    user_voiceprint_profile_id = None
    if payload.set_as_user_profile:
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


@router.get("/status", response_model=VoiceprintProfilesStatusResponse)
def get_voiceprint_profiles_status(
    preference_service: AppPreferenceService = Depends(get_app_preference_service),
    profile_service: VoiceprintProfileService = Depends(get_voiceprint_profile_service),
    transcription_service: TranscriptionSettingsService = Depends(
        get_transcription_settings_service
    ),
) -> VoiceprintProfilesStatusResponse:
    return _voiceprint_profiles_status(
        preference_service,
        profile_service,
        transcription_service,
    )


@router.post("/consent", response_model=VoiceprintProfilesConsentResponse)
def record_voiceprint_profiles_consent(
    preference_service: AppPreferenceService = Depends(get_app_preference_service),
) -> VoiceprintProfilesConsentResponse:
    consent_at = preference_service.record_voiceprint_profiles_consent()
    return VoiceprintProfilesConsentResponse(consent_at=consent_at)


@router.patch("/status", response_model=VoiceprintProfilesStatusResponse)
def toggle_voiceprint_profiles(
    payload: VoiceprintProfilesToggleRequest,
    preference_service: AppPreferenceService = Depends(get_app_preference_service),
    profile_service: VoiceprintProfileService = Depends(get_voiceprint_profile_service),
    transcription_service: TranscriptionSettingsService = Depends(
        get_transcription_settings_service
    ),
) -> VoiceprintProfilesStatusResponse:
    transcription_service.update_settings(
        UpdateTranscriptionSettingsRequest(voiceprint_auto_label_enabled=payload.enabled)
    )
    return _voiceprint_profiles_status(
        preference_service,
        profile_service,
        transcription_service,
    )


@router.delete("/data", response_model=OkResponse)
def delete_voiceprint_profiles_data(
    service: VoiceprintProfileService = Depends(get_voiceprint_profile_service),
    user_settings: UserSettingsService = Depends(get_user_settings_service),
) -> OkResponse:
    service.delete_all_data()
    user_settings.clear_user_voiceprint_profile_if_set()
    return OkResponse()


@router.get("/{profile_id}", response_model=VoiceprintProfileDetailResponse)
def get_voiceprint_profile(
    profile_id: str,
    service: VoiceprintProfileService = Depends(get_voiceprint_profile_service),
) -> VoiceprintProfileDetailResponse:
    detail = service.get_profile_detail(profile_id)
    profile = detail["profile"]
    return VoiceprintProfileDetailResponse(
        id=profile.id,
        display_name=profile.display_name,
        notes=profile.notes,
        embedding_count=len(detail["embeddings"]),
        embedding_description=detail["embedding_description"],
        embeddings=[
            VoiceprintEmbeddingSummary.model_validate(item)
            for item in detail["embeddings"]
        ],
        related_recordings=[
            RelatedRecordingSummary.model_validate(item)
            for item in detail["related_recordings"]
        ],
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.patch("/{profile_id}", response_model=VoiceprintProfileResponse)
def update_voiceprint_profile(
    profile_id: str,
    payload: UpdateVoiceprintProfileRequest,
    service: VoiceprintProfileService = Depends(get_voiceprint_profile_service),
) -> VoiceprintProfileResponse:
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


@router.delete("/{profile_id}", response_model=OkResponse)
def delete_voiceprint_profile(
    profile_id: str,
    service: VoiceprintProfileService = Depends(get_voiceprint_profile_service),
    user_settings: UserSettingsService = Depends(get_user_settings_service),
) -> OkResponse:
    profile = service.get_profile(profile_id)
    service.delete_profile(profile)
    user_settings.clear_user_voiceprint_profile(profile_id)
    return OkResponse()
