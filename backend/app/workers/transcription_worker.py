import logging
import tempfile
from pathlib import Path

from sqlmodel import Session

from app.config import get_settings
from app.core.errors import AppError
from app.services.asr_service import AsrService
from app.services.audio_service import AudioService
from app.services.diarization_service import (
    DiarizationService,
    DiarizationTurn,
    SpeakerSegment,
    build_labeled_transcript,
    cleanup_temp_dir,
    extract_audio_slice,
    merge_adjacent_turns,
    speaker_segments_to_json,
)
from app.services.job_service import JobService
from app.services.recording_service import RecordingService
from app.core.startup_diagnostics import log_error_guidance, log_transcription_pipeline
from app.storage.database import get_engine

logger = logging.getLogger(__name__)

DIARIZATION_FALLBACK_CODES = {"DIARIZATION_MODEL_LOAD_FAILED", "DIARIZATION_FAILED"}


def _mark_recording_failed(
    recording_service: RecordingService,
    job,
    error_message: str,
) -> None:
    if not job.result_id:
        return
    try:
        transcript = recording_service.get_recording(job.result_id)
        recording_service.update_recording(
            transcript,
            status="failed",
            error_message=error_message,
        )
    except AppError:
        pass


def _transcribe_single_pass(
    *,
    job_service: JobService,
    job,
    asr_service: AsrService,
    normalized_path: str,
    language: str,
) -> tuple[str, str | None, list[SpeakerSegment]]:
    job_service.update_job(job, progress=0.28, stage="loading_model")
    asr_service.load_model()
    job_service.update_job(job, progress=0.4, stage="running_asr")

    def on_chunk(
        chunk_index: int,
        total_chunks: int,
        _start_sec: float,
        _end_sec: float,
        _text: str,
        _language: str | None,
    ) -> None:
        progress = 0.4 + (0.4 * chunk_index / total_chunks)
        job_service.update_job(
            job,
            progress=progress,
            stage=f"running_asr_chunk_{chunk_index}_of_{total_chunks}",
        )

    result = asr_service.transcribe(
        normalized_path,
        language=language,
        on_chunk=on_chunk,
    )
    return result.text, result.language, []


def _transcribe_with_diarization(
    *,
    job_service: JobService,
    job,
    asr_service: AsrService,
    diarization_service: DiarizationService,
    audio_service: AudioService,
    audio_asset,
    language: str,
    session: Session,
) -> tuple[str, str | None, list[SpeakerSegment], str | None]:
    settings = get_settings()
    diarization_path = (
        audio_asset.original_path
        if settings.diarization_use_original_audio
        else audio_asset.normalized_path
    )
    if not diarization_path:
        raise AppError(
            "AUDIO_NORMALIZATION_FAILED",
            "Normalized audio is not available.",
            500,
        )

    duration = audio_service.get_duration(diarization_path)
    job_service.update_job(job, progress=0.25, stage="running_diarization")
    turns = diarization_service.diarize(diarization_path, duration)
    merged_turns = merge_adjacent_turns(
        turns,
        min_segment_seconds=settings.diarization_min_segment_seconds,
        merge_gap_seconds=settings.diarization_merge_gap_seconds,
        max_segments=settings.diarization_max_segments,
    )

    min_segment = settings.diarization_min_segment_seconds
    if not merged_turns:
        merged_turns = [
            DiarizationTurn(
                "Speaker 1",
                0.0,
                max(duration or min_segment, min_segment),
                cluster_id="SPEAKER_00",
            )
        ]

    cluster_resolutions: dict[str, "VoiceprintMatchResult"] = {}
    voiceprint_note: str | None = None
    from app.services.app_preference_service import AppPreferenceService
    from app.services.voiceprint_embedding_service import VoiceprintEmbeddingService
    from app.services.voiceprint_matching_service import (
        VoiceprintMatchingService,
        VoiceprintMatchResult,
    )

    preference_service = AppPreferenceService(session, settings)
    from app.services.transcription_settings_service import TranscriptionSettingsService

    transcription_settings = TranscriptionSettingsService(session, settings)
    speaker_memory_enabled = transcription_settings.is_speaker_memory_enabled()
    auto_label_enabled = transcription_settings.is_speaker_auto_label_enabled()
    consent_given = preference_service.has_speaker_memory_consent()
    speaker_memory_active = (
        speaker_memory_enabled and auto_label_enabled and consent_given
    )
    logger.debug(
        "Voiceprint auto-label gate: active=%s memory_enabled=%s auto_label=%s consent=%s diarization_path=%s clusters=%d",
        speaker_memory_active,
        speaker_memory_enabled,
        auto_label_enabled,
        consent_given,
        diarization_path,
        len(merged_turns),
    )
    if speaker_memory_active:
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

    diarization_service.unload_pipeline()
    job_service.update_job(job, progress=0.28, stage="loading_model")
    asr_service.load_model()

    temp_dir = Path(tempfile.mkdtemp(prefix="finch_segments_"))
    segments: list[SpeakerSegment] = []
    detected_language: str | None = None
    total = max(len(merged_turns), 1)

    try:
        for index, turn in enumerate(merged_turns, start=1):
            progress = 0.3 + (0.45 * index / total)
            job_service.update_job(
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
            result = asr_service.transcribe(slice_path, language=language)
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


def run_transcription_job(job_id: str, audio_asset_id: str, language: str = "auto") -> None:
    settings = get_settings()

    with Session(get_engine()) as session:
        from app.services.transcription_settings_service import TranscriptionSettingsService

        job_service = JobService(session, settings)
        audio_service = AudioService(session, settings)
        recording_service = RecordingService(session, settings)
        transcription_settings = TranscriptionSettingsService(session, settings)
        stored_hf_token = transcription_settings.get_hf_token()
        asr_service = AsrService(settings)
        diarization_service = DiarizationService(settings, hf_token=stored_hf_token)

        job = job_service.get_job(job_id)

        try:
            logger.info(
                "Starting transcription job %s (audio=%s, language=%s)",
                job_id,
                audio_asset_id,
                language,
            )
            log_transcription_pipeline(settings, session=session)

            job_service.update_job(job, status="processing", progress=0.1, stage="loading_model")

            audio_asset = audio_service.get_audio(audio_asset_id)
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

            if transcription_settings.is_diarization_enabled():
                try:
                    diarization_service.load_pipeline()
                    raw_text, detected_language, segments, voiceprint_note = _transcribe_with_diarization(
                        job_service=job_service,
                        job=job,
                        asr_service=asr_service,
                        diarization_service=diarization_service,
                        audio_service=audio_service,
                        audio_asset=audio_asset,
                        language=language,
                        session=session,
                    )
                    if voiceprint_note and not processing_note:
                        processing_note = voiceprint_note
                except AppError as exc:
                    diarization_service.unload_pipeline()
                    if exc.code in DIARIZATION_FALLBACK_CODES:
                        logger.warning(
                            "Diarization unavailable (%s) — falling back to full-file ASR without speaker labels",
                            exc.message,
                        )
                        log_error_guidance(exc.code, exc.message)
                        processing_note = (
                            f"Speaker labels unavailable: {exc.message} "
                            "Set HF_TOKEN in .env or run huggingface-cli login, then re-transcribe."
                        )
                        raw_text, detected_language, segments = _transcribe_single_pass(
                            job_service=job_service,
                            job=job,
                            asr_service=asr_service,
                            normalized_path=audio_asset.normalized_path,
                            language=language,
                        )
                    else:
                        raise
            else:
                raw_text, detected_language, segments = _transcribe_single_pass(
                    job_service=job_service,
                    job=job,
                    asr_service=asr_service,
                    normalized_path=audio_asset.normalized_path,
                    language=language,
                )

            job_service.update_job(job, progress=0.8, stage="saving_recording")
            if not job.result_id:
                raise AppError(
                    "RECORDING_NOT_FOUND",
                    "Transcript placeholder is missing for this job.",
                    500,
                )
            transcript = recording_service.get_recording(job.result_id)
            speaker_json = speaker_segments_to_json(segments) if segments else None
            recording_service.update_recording(
                transcript,
                raw_text=raw_text,
                language=detected_language,
                speaker_segments=speaker_json,
                status="draft",
                error_message=None,
                processing_note=processing_note,
            )

            if segments:
                speakers = sorted({segment.speaker for segment in segments})
                logger.info(
                    "Transcription job %s completed: %d speaker segment(s), speakers=%s, language=%s",
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
                    if transcription_settings.is_diarization_enabled()
                    else "",
                )
            if processing_note:
                logger.warning("Processing note saved on transcript: %s", processing_note)

            job_service.update_job(
                job,
                status="completed",
                progress=1.0,
                stage="completed",
                result_id=transcript.id,
            )
        except AppError as exc:
            log_error_guidance(exc.code, exc.message)
            _mark_recording_failed(recording_service, job, exc.message)
            job_service.update_job(
                job,
                status="failed",
                stage=job.stage,
                error=exc.message,
            )
        except Exception as exc:
            logger.exception("Transcription job %s failed with unexpected error", job_id)
            _mark_recording_failed(recording_service, job, str(exc))
            job_service.update_job(
                job,
                status="failed",
                stage=job.stage,
                error=str(exc),
            )
