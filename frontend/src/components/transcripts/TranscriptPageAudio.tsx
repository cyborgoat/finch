
import { TranscriptAudioPlayer } from "@/components/transcripts/TranscriptAudioPlayer"
import { useAudioAsset } from "@/hooks/useAudioAsset"
import { useTranscriptPlayback } from "@/hooks/useTranscriptPlayback"

type TranscriptPageAudioProps = {
  audioAssetId: string
  className?: string
}

export function TranscriptPageAudio({ audioAssetId, className }: TranscriptPageAudioProps) {
  const { data: audioAsset } = useAudioAsset(audioAssetId)
  const playback = useTranscriptPlayback(audioAssetId)

  return (
    <TranscriptAudioPlayer
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
      onPlay={playback.handlePlay}
      onPause={playback.handlePause}
      onEnded={playback.handleEnded}
    />
  )
}
