
import { RecordingAudioPlayer } from "@/components/transcripts/TranscriptAudioPlayer"
import { useAudioAsset } from "@/hooks/useAudioAsset"
import { useRecordingPlayback } from "@/hooks/useRecordingPlayback"

type RecordingPageAudioProps = {
  audioAssetId: string
  className?: string
}

export function RecordingPageAudio({ audioAssetId, className }: RecordingPageAudioProps) {
  const { data: audioAsset } = useAudioAsset(audioAssetId)
  const playback = useRecordingPlayback(
    audioAssetId,
    audioAsset?.durationSeconds,
  )

  return (
    <RecordingAudioPlayer
      className={className}
      filename={audioAsset?.filename}
      audioRef={playback.audioRef}
      src={playback.src}
      isPlaying={playback.isPlaying}
      currentTime={playback.currentTime}
      duration={playback.duration || audioAsset?.durationSeconds || 0}
      isReady={playback.isReady}
      playbackRate={playback.playbackRate}
      onPlaybackRateChange={playback.setPlaybackRate}
      onTogglePlay={playback.togglePlay}
      onSkipBackward={playback.skipBackward}
      onSkipForward={playback.skipForward}
      onSeekInput={playback.handleSeekInput}
      onTimeUpdate={playback.handleTimeUpdate}
      onLoadedMetadata={playback.handleLoadedMetadata}
      onCanPlay={playback.handleCanPlay}
      onDurationChange={playback.handleDurationChange}
      onPlay={playback.handlePlay}
      onPause={playback.handlePause}
      onEnded={playback.handleEnded}
    />
  )
}
