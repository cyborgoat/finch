import concurrent.futures
import logging
import tempfile
from pathlib import Path

from sqlmodel import Session

from app.capabilities.error_catalog import log_error_guidance
from app.capabilities.startup import log_transcription_pipeline
from app.config import Settings, get_settings
from app.core.enums import JobStatus, RecordingStatus
from app.core.errors import AppError
from app.core.progress_log import progress_log
from app.domains.jobs.job_service import JobService
from app.domains.media.audio_service import AudioService
from app.domains.recordings.recording_service import RecordingService
from app.domains.settings.transcription_settings_service import TranscriptionSettingsService
from app.domains.transcription.asr_service import AsrService
from app.domains.transcription.audio_purification_service import (
    AudioPurificationService,
    PurifiedAudio,
    cleanup_purified,
    format_purification_note,
    remap_turns_to_original,
)
from app.domains.transcription.diarization_service import (
    DiarizationService,
    cleanup_temp_dir,
    extract_audio_slice,
    merge_adjacent_turns,
)
from app.domains.transcription.pipeline_diarization import (
    build_diarization_fallback_note,
    should_fallback_from_diarization,
)
from app.domains.transcription.pipeline_voiceprint import apply_voiceprint_labels
from app.domains.transcription.segment_limits import (
    build_segment_cap_note,
    resolve_effective_max_segments,
)
from app.domains.transcription.types import (
    DiarizationTurn,
    SpeakerSegment,
    build_labeled_transcript,
    speaker_segments_to_json,
)
from app.domains.voiceprint.matching_service import VoiceprintMatchResult
from app.workers.cancellation import check_cancelled

logger = logging.getLogger(__name__)


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
        self.audio_purification_service = AudioPurificationService(self.settings)

    def run(self, job_id: str, audio_asset_id: str, language: str = "auto") -> None:
        job = self.job_service.get_job(job_id)

        try:
            logger.info(
                "Starting transcription job %s (audio=%s, language=%s)",
                job_id,
                audio_asset_id,
                language,
            )
            check_cancelled()
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

            if self.transcription_settings.is_diarization_enabled():
                try:
                    self.diarization_service.load_pipeline()
                    raw_text, detected_language, segments = self._transcribe_with_diarization(
                        job=job,
                        audio_asset=audio_asset,
                        language=language,
                    )
                except AppError as exc:
                    self.diarization_service.unload_pipeline()
                    if should_fallback_from_diarization(exc):
                        logger.warning(
                            "Diarization unavailable (%s) — falling back to "
                            "full-file ASR without speaker labels",
                            exc.message,
                        )
                        logger.warning("%s", build_diarization_fallback_note(exc))
                        log_error_guidance(exc.code, exc.message)
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
                processing_note=None,
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
                    " (no speaker labels — see worker logs)"
                    if self.transcription_settings.is_diarization_enabled()
                    else "",
                )

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
        finally:
            self._release_models()

    def _release_models(self) -> None:
        self.asr_service.unload_model()
        self.diarization_service.unload_pipeline()

    def _diarize_with_progress(
        self,
        job,
        audio_path: str,
        duration_seconds: float | None,
    ):
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(
                self.diarization_service.diarize,
                audio_path,
                duration_seconds,
            )
            progress = 0.25
            while True:
                check_cancelled()
                try:
                    return future.result(timeout=10)
                except concurrent.futures.TimeoutError:
                    progress = min(progress + 0.005, 0.279)
                    self.job_service.update_job(
                        job,
                        progress=progress,
                        stage="running_diarization",
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
            check_cancelled()
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
    ) -> tuple[str, str | None, list[SpeakerSegment]]:
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

        purified: PurifiedAudio | None = None
        try:
            duration = self.audio_service.get_duration(diarization_path)
            diarize_path = diarization_path
            diarize_duration = duration

            if self.settings.audio_purification_enabled:
                self.job_service.update_job(job, progress=0.2, stage="purifying_audio")
                try:
                    purified = self.audio_purification_service.prepare_for_diarization(
                        diarization_path
                    )
                    if purified is not None:
                        diarize_path = purified.path
                        diarize_duration = purified.duration_sec
                        logger.info(
                            "%s",
                            format_purification_note(
                                purified.original_duration_sec,
                                purified.duration_sec,
                            ),
                        )
                except Exception as exc:
                    logger.warning(
                        "Audio purification failed (%s) — using original audio for diarization",
                        exc,
                    )

            self.job_service.update_job(job, progress=0.25, stage="running_diarization")
            turns = self._diarize_with_progress(job, diarize_path, diarize_duration)
            if purified is not None and purified.time_map:
                turns = remap_turns_to_original(turns, purified.time_map)

            effective_max_segments = resolve_effective_max_segments(
                self.settings,
                duration,
            )
            merged_all = merge_adjacent_turns(
                turns,
                min_segment_seconds=self.settings.diarization_min_segment_seconds,
                merge_gap_seconds=self.settings.diarization_merge_gap_seconds,
                max_segments=0,
            )
            segment_cap_note: str | None = None
            if effective_max_segments > 0 and len(merged_all) > effective_max_segments:
                merged_turns = merged_all[:effective_max_segments]
                transcribed_until = merged_turns[-1].end_sec if merged_turns else 0.0
                segment_cap_note = build_segment_cap_note(
                    max_segments=effective_max_segments,
                    audio_duration_sec=duration or transcribed_until,
                    transcribed_until_sec=transcribed_until,
                    total_segments_before_cap=len(merged_all),
                )
                logger.warning("%s", segment_cap_note)
            else:
                merged_turns = merged_all

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
            merged_turns, cluster_resolutions = apply_voiceprint_labels(
                session=self.session,
                settings=self.settings,
                job_service=self.job_service,
                transcription_settings=self.transcription_settings,
                job=job,
                diarization_path=diarization_path,
                merged_turns=merged_turns,
            )

            self.diarization_service.unload_pipeline()
            self.job_service.update_job(job, progress=0.28, stage="loading_model")
            self.asr_service.load_model()

            temp_dir = Path(tempfile.mkdtemp(prefix="finch_segments_"))
            segments: list[SpeakerSegment] = []
            detected_language: str | None = None
            total = max(len(merged_turns), 1)

            try:
                with progress_log("ASR segments", total, unit="seg") as asr_progress:
                    for index, turn in enumerate(merged_turns, start=1):
                        check_cancelled()
                        job_progress = 0.3 + (0.45 * index / total)
                        self.job_service.update_job(
                            job,
                            progress=job_progress,
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
                        asr_progress.step()
            finally:
                cleanup_temp_dir(temp_dir)
                temp_dir.rmdir()

            raw_text = build_labeled_transcript(segments)
            return raw_text, detected_language, segments
        finally:
            cleanup_purified(purified)
