import logging

from sqlmodel import Session

from app.config import Settings
from app.core.errors import AppError
from app.domains.jobs.job_service import JobService
from app.domains.settings.app_preference_service import AppPreferenceService
from app.domains.settings.transcription_settings_service import TranscriptionSettingsService
from app.domains.transcription.types import DiarizationTurn
from app.domains.voiceprint.embedding_service import VoiceprintEmbeddingService
from app.domains.voiceprint.matching_service import (
    VoiceprintMatchingService,
    VoiceprintMatchResult,
)

logger = logging.getLogger(__name__)


def apply_voiceprint_labels(
    *,
    session: Session,
    settings: Settings,
    job_service: JobService,
    transcription_settings: TranscriptionSettingsService,
    job,
    diarization_path: str,
    merged_turns: list[DiarizationTurn],
) -> tuple[list[DiarizationTurn], dict[str, VoiceprintMatchResult], str | None]:
    preference_service = AppPreferenceService(session)
    voiceprint_profiles_enabled = transcription_settings.is_voiceprint_profiles_enabled()
    voiceprint_auto_label_enabled = transcription_settings.is_voiceprint_auto_label_enabled()
    consent_given = preference_service.has_voiceprint_profiles_consent()
    voiceprint_profiles_active = (
        voiceprint_profiles_enabled and voiceprint_auto_label_enabled and consent_given
    )
    logger.debug(
        "Voiceprint auto-label gate: active=%s profiles_enabled=%s "
        "auto_label=%s consent=%s diarization_path=%s clusters=%d",
        voiceprint_profiles_active,
        voiceprint_profiles_enabled,
        voiceprint_auto_label_enabled,
        consent_given,
        diarization_path,
        len(merged_turns),
    )

    cluster_resolutions: dict[str, VoiceprintMatchResult] = {}
    voiceprint_note: str | None = None
    if not voiceprint_profiles_active:
        return merged_turns, cluster_resolutions, voiceprint_note

    job_service.update_job(job, progress=0.27, stage="running_voiceprint_matching")
    try:
        embedding_service = VoiceprintEmbeddingService(
            settings,
            hf_token=transcription_settings.get_hf_token(),
        )
        cluster_embeddings = embedding_service.extract_cluster_embeddings(
            diarization_path,
            merged_turns,
        )
        matching_service = VoiceprintMatchingService(session, settings)
        cluster_resolutions = matching_service.resolve_display_names(
            merged_turns,
            cluster_embeddings,
        )
        merged_turns = matching_service.apply_names_to_turns(
            merged_turns,
            cluster_resolutions,
        )
        matched_count = sum(
            1
            for resolution in cluster_resolutions.values()
            if resolution.match_status == "matched"
        )
        if cluster_resolutions and matched_count == 0:
            voiceprint_note = (
                "Voiceprint auto-label ran but no speaker matched the saved threshold. "
                "Try re-recording your voiceprint or assign a speaker manually on a turn."
            )
        embedding_service.unload_model()
    except AppError as exc:
        logger.warning(
            "Speaker matching unavailable (%s) — using generic speaker labels",
            exc.message,
        )

    return merged_turns, cluster_resolutions, voiceprint_note
