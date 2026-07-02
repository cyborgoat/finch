import logging
import tempfile
from pathlib import Path

from sqlmodel import Session

from app.capabilities.error_catalog import log_error_guidance
from app.capabilities.startup import log_transcription_pipeline
from app.config import Settings, get_settings
from app.core.enums import JobStatus, RecordingStatus
from app.core.errors import AppError
from app.domains.jobs.job_service import JobService
from app.domains.media.audio_service import AudioService
from app.domains.recordings.recording_service import RecordingService
from app.domains.settings.app_preference_service import AppPreferenceService
from app.domains.settings.transcription_settings_service import TranscriptionSettingsService
from app.domains.transcription.asr_service import AsrService
from app.domains.transcription.diarization_service import (
    DiarizationService,
    cleanup_temp_dir,
    extract_audio_slice,
    merge_adjacent_turns,
)
from app.domains.transcription.types import (
    DiarizationTurn,
    SpeakerSegment,
    build_labeled_transcript,
    speaker_segments_to_json,
)
from app.domains.voiceprint.embedding_service import VoiceprintEmbeddingService
from app.domains.voiceprint.matching_service import (
    VoiceprintMatchingService,
    VoiceprintMatchResult,
)

logger = logging.getLogger(__name__)

DIARIZATION_FALLBACK_CODES = {"DIARIZATION_MODEL_LOAD_FAILED", "DIARIZATION_FAILED"}


class TranscriptionPipeline:
    def __init__(self, session: Session, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.job_service = JobService(session)
        self.audio_service = AudioService(session, self.settings)
        self.recording_service = RecordingService(session)
        self.transcription_settings = TranscriptionSettingsService(session, self.settings)
        stored_hf_token = self.transcription_settings.get_hf_token()
        self.asr_service = AsrService(self.settings)
        self.diarization_service = DiarizationService(self.settings, hf_token=stored_hf_token)

    def run(self, job_id: str, audio_asset_id: str, language: str = "auto") -> None:
        job = self.job_service.get_job(job_id)

        try:
            logger.info(
                "Starting transcription job %s (audio=%s, language=%s)",
                job_id,
                audio_asset_id,
                language,
            )
            log_transcription_pipeline(self.settings, session=self.session)

            self.job_service.update_job(
                job,
                status=JobStatus.PROCESSING,
                progress=0.1,
                stage="loading_model",
            )

            audio_asset = self.audio_service.get_audio(audio_asset_id)
            if not audio_asset.normalized_path:
                raise AppError(
                    "AUDIO_NORMALIZATION_FAILED",
                    "Normalized audio is not available.",
                    500,
                )

            raw_text: str
            detected_language: str | None
            segments: list[SpeakerSegment]
            processing_note: str | None = None

            if self.transcription_settings.is_diarization_enabled():
                try:
                    self.diarization_service.load_pipeline()
                    raw_text, detected_language, segments, voiceprint_note = (
                        self._transcribe_with_diarization(
                            job=job,
                            audio_asset=audio_asset,
                            language=language,
                        )
                    )
                    if voiceprint_note and not processing_note:
                        processing_note = voiceprint_note
                except AppError as exc:
                    self.diarization_service.unload_pipeline()
                    if exc.code in DIARIZATION_FALLBACK_CODES:
                        logger.warning(
                            "Diarization unavailable (%s) — falling back to "
                            "full-file ASR without speaker labels",
                            exc.message,
                        )
                        log_error_guidance(exc.code, exc.message)
                        processing_note = (
                            f"Speaker labels unavailable: {exc.message} "
                            "Set HF_TOKEN in .env or run huggingface-cli login, then re-transcribe."
                        )
                        raw_text, detected_language, segments = self._transcribe_single_pass(
                            job=job,
                            normalized_path=audio_asset.normalized_path,
                            language=language,
                        )
                    else:
                        raise
            else:
                raw_text, detected_language, segments = self._transcribe_single_pass(
                    job=job,
                    normalized_path=audio_asset.normalized_path,
                    language=language,
                )

            self.job_service.update_job(job, progress=0.8, stage="saving_recording")
            if not job.result_id:
                raise AppError(
                    "RECORDING_NOT_FOUND",
                    "Transcript placeholder is missing for this job.",
                    500,
                )
            transcript = self.recording_service.get_recording(job.result_id)
            speaker_json = speaker_segments_to_json(segments) if segments else None
            self.recording_service.update_recording(
                transcript,
                raw_text=raw_text,
                language=detected_language,
                speaker_segments=speaker_json,
                status=RecordingStatus.DRAFT,
                error_message=None,
                processing_note=processing_note,
            )

            if segments:
                speakers = sorted({segment.speaker for segment in segments})
                logger.info(
                    "Transcription job %s completed: %d speaker segment(s), "
                    "speakers=%s, language=%s",
                    job_id,
                    len(segments),
                    ", ".join(speakers),
                    detected_language or "unknown",
                )
            else:
                logger.info(
                    "Transcription job %s completed: single-pass transcript, language=%s%s",
                    job_id,
                    detected_language or "unknown",
                    " (no speaker labels — see startup logs or transcript processing note)"
                    if self.transcription_settings.is_diarization_enabled()
                    else "",
                )
            if processing_note:
                logger.warning("Processing note saved on transcript: %s", processing_note)

            self.job_service.update_job(
                job,
                status=JobStatus.COMPLETED,
                progress=1.0,
                stage="completed",
                result_id=transcript.id,
            )
        except AppError as exc:
            log_error_guidance(exc.code, exc.message)
            self._mark_recording_failed(job, exc.message)
            self.job_service.update_job(
                job,
                status=JobStatus.FAILED,
                stage=job.stage,
                error=exc.message,
            )
        except Exception as exc:
            logger.exception("Transcription job %s failed with unexpected error", job_id)
            self._mark_recording_failed(job, str(exc))
            self.job_service.update_job(
                job,
                status=JobStatus.FAILED,
                stage=job.stage,
                error=str(exc),
            )

    def _mark_recording_failed(self, job, error_message: str) -> None:
        if not job.result_id:
            return
        try:
            transcript = self.recording_service.get_recording(job.result_id)
            self.recording_service.update_recording(
                transcript,
                status=RecordingStatus.FAILED,
                error_message=error_message,
            )
        except AppError:
            pass

    def _transcribe_single_pass(
        self,
        *,
        job,
        normalized_path: str,
        language: str,
    ) -> tuple[str, str | None, list[SpeakerSegment]]:
        self.job_service.update_job(job, progress=0.28, stage="loading_model")
        self.asr_service.load_model()
        self.job_service.update_job(job, progress=0.4, stage="running_asr")

        def on_chunk(
            chunk_index: int,
            total_chunks: int,
            _start_sec: float,
            _end_sec: float,
            _text: str,
            _language: str | None,
        ) -> None:
            progress = 0.4 + (0.4 * chunk_index / total_chunks)
            self.job_service.update_job(
                job,
                progress=progress,
                stage=f"running_asr_chunk_{chunk_index}_of_{total_chunks}",
            )

        result = self.asr_service.transcribe(
            normalized_path,
            language=language,
            on_chunk=on_chunk,
        )
        return result.text, result.language, []

    def _transcribe_with_diarization(
        self,
        *,
        job,
        audio_asset,
        language: str,
    ) -> tuple[str, str | None, list[SpeakerSegment], str | None]:
        diarization_path = (
            audio_asset.original_path
            if self.settings.diarization_use_original_audio
            else audio_asset.normalized_path
        )
        if not diarization_path:
            raise AppError(
                "AUDIO_NORMALIZATION_FAILED",
                "Normalized audio is not available.",
                500,
            )

        duration = self.audio_service.get_duration(diarization_path)
        self.job_service.update_job(job, progress=0.25, stage="running_diarization")
        turns = self.diarization_service.diarize(diarization_path, duration)
        merged_turns = merge_adjacent_turns(
            turns,
            min_segment_seconds=self.settings.diarization_min_segment_seconds,
            merge_gap_seconds=self.settings.diarization_merge_gap_seconds,
            max_segments=self.settings.diarization_max_segments,
        )

        min_segment = self.settings.diarization_min_segment_seconds
        if not merged_turns:
            merged_turns = [
                DiarizationTurn(
                    "Speaker 1",
                    0.0,
                    max(duration or min_segment, min_segment),
                    cluster_id="SPEAKER_00",
                )
            ]

        cluster_resolutions: dict[str, VoiceprintMatchResult] = {}
        voiceprint_note: str | None = None

        preference_service = AppPreferenceService(self.session)
        voiceprint_profiles_enabled = self.transcription_settings.is_voiceprint_profiles_enabled()
        voiceprint_auto_label_enabled = (
            self.transcription_settings.is_voiceprint_auto_label_enabled()
        )
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
        if voiceprint_profiles_active:
            self.job_service.update_job(job, progress=0.27, stage="running_voiceprint_matching")
            try:
                embedding_service = VoiceprintEmbeddingService(
                    self.settings,
                    hf_token=self.transcription_settings.get_hf_token(),
                )
                cluster_embeddings = embedding_service.extract_cluster_embeddings(
                    diarization_path,
                    merged_turns,
                )
                matching_service = VoiceprintMatchingService(self.session, self.settings)
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

        self.diarization_service.unload_pipeline()
        self.job_service.update_job(job, progress=0.28, stage="loading_model")
        self.asr_service.load_model()

        temp_dir = Path(tempfile.mkdtemp(prefix="finch_segments_"))
        segments: list[SpeakerSegment] = []
        detected_language: str | None = None
        total = max(len(merged_turns), 1)

        try:
            for index, turn in enumerate(merged_turns, start=1):
                progress = 0.3 + (0.45 * index / total)
                self.job_service.update_job(
                    job,
                    progress=progress,
                    stage=f"running_asr_segment_{index}_of_{total}",
                )
                slice_path = extract_audio_slice(
                    audio_asset.normalized_path or diarization_path,
                    turn.start_sec,
                    turn.end_sec,
                    str(temp_dir),
                    f"seg_{index}",
                )
                result = self.asr_service.transcribe(slice_path, language=language)
                if result.language and not detected_language:
                    detected_language = result.language
                cluster_id = turn.cluster_id or turn.speaker
                resolution = cluster_resolutions.get(cluster_id)
                speaker_label = (
                    resolution.display_name
                    if resolution is not None
                    else turn.speaker
                )
                segments.append(
                    SpeakerSegment(
                        speaker=speaker_label,
                        start_sec=turn.start_sec,
                        end_sec=turn.end_sec,
                        text=result.text.strip(),
                        cluster_id=turn.cluster_id,
                        voiceprint_profile_id=(
                            resolution.voiceprint_profile_id if resolution else None
                        ),
                        match_confidence=(
                            resolution.match_confidence if resolution else None
                        ),
                        match_status=resolution.match_status if resolution else None,
                    )
                )
        finally:
            cleanup_temp_dir(temp_dir)
            temp_dir.rmdir()

        raw_text = build_labeled_transcript(segments)
        return raw_text, detected_language, segments, voiceprint_note
