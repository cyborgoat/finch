import { useTranslation } from "react-i18next"
import { RecordingAudioPlayer } from "@/components/transcripts/TranscriptAudioPlayer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAudioAsset } from "@/hooks/useAudioAsset"
import { useAudioSourceEdit } from "@/hooks/useAudioSourceEdit"
import { useRecordingPlayback } from "@/hooks/useRecordingPlayback"

type RecordingPlayback = ReturnType<typeof useRecordingPlayback>

type RecordingPageAudioProps = {
  recordingId: string
  audioAssetId: string
  title: string
  className?: string
  variant?: "card" | "embedded"
  playback?: RecordingPlayback
  editDisabled?: boolean
}

export function RecordingPageAudio({
  recordingId,
  audioAssetId,
  title,
  className,
  variant = "card",
  playback: externalPlayback,
  editDisabled,
}: RecordingPageAudioProps) {
  const { t } = useTranslation()
  const { data: audioAsset } = useAudioAsset(audioAssetId)
  const internalPlayback = useRecordingPlayback(
    audioAssetId,
    audioAsset?.durationSeconds,
  )
  const playback = externalPlayback ?? internalPlayback
  const duration = playback.duration || audioAsset?.durationSeconds || 0

  const edit = useAudioSourceEdit({
    recordingId,
    audioAssetId,
    duration,
    audioRef: playback.audioRef,
    seek: playback.seek,
  })

  const handleTimeUpdate = () => {
    if (edit.isEditing) {
      edit.handleEditTimeUpdate()
      return
    }
    playback.handleTimeUpdate()
  }

  return (
    <>
      <RecordingAudioPlayer
        className={className}
        variant={variant}
        filename={title}
        audioRef={playback.audioRef}
        src={playback.src}
        isPlaying={playback.isPlaying}
        currentTime={playback.currentTime}
        duration={duration}
        playbackRate={playback.playbackRate}
        onPlaybackRateChange={playback.setPlaybackRate}
        onTogglePlay={edit.isEditing ? edit.toggleEditPlay : playback.togglePlay}
        onSkipBackward={playback.skipBackward}
        onSkipForward={playback.skipForward}
        onSeekInput={playback.handleSeekInput}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={playback.handleLoadedMetadata}
        onCanPlay={playback.handleCanPlay}
        onDurationChange={playback.handleDurationChange}
        onPlay={playback.handlePlay}
        onPause={playback.handlePause}
        onEnded={playback.handleEnded}
        editable
        editDisabled={editDisabled}
        isEditing={edit.isEditing}
        onEnterEdit={edit.enterEdit}
        onCancelEdit={edit.exitEdit}
        trimStart={edit.trimStart}
        trimEnd={edit.trimEnd}
        onTrimChange={edit.handleTrimChange}
        onEditSeek={edit.handleEditSeek}
        editCurrentTime={edit.editCurrentTime}
        selectedDuration={edit.selectedDuration}
        onSaveAsNew={edit.saveAsNew}
        onReplace={edit.requestReplace}
        editPending={edit.isPending}
        canSubmitEdit={edit.canSubmit}
      />

      <AlertDialog open={edit.replaceConfirmOpen} onOpenChange={edit.setReplaceConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("audioEdit.replaceConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("audioEdit.replaceConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={edit.isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction disabled={edit.isPending} onClick={edit.confirmReplace}>
              {edit.isPending ? t("audioEdit.processing") : t("audioEdit.replaceCurrent")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
