import { Mic, Square } from "lucide-react"
import { useTranslation } from "react-i18next"
import { AudioWaveform } from "@/components/audio/AudioWaveform"
import {
  AudioPrimaryIconButton,
  AudioSecondaryIconButton,
} from "@/components/audio/AudioDialogControls"
import type { RecorderState } from "@/hooks/useAudioRecorder"

type AudioSoundCheckSectionProps = {
  state: RecorderState
  mediaStream: MediaStream | null
  audioBlob: Blob | null
  error: string | null
  busy?: boolean
  onTestStart: () => void
  onStart: () => void
  onStop: () => void
  labels: {
    start: string
    active: string
    stop: string
  }
}

export function AudioSoundCheckSection({
  state,
  mediaStream,
  audioBlob,
  error,
  busy,
  onTestStart,
  onStart,
  onStop,
  labels,
}: AudioSoundCheckSectionProps) {
  const { t } = useTranslation()
  const micActive = state === "recording" || state === "paused"

  return (
    <div className="space-y-4">
      <AudioWaveform state={state} stream={mediaStream} audioBlob={audioBlob} />
      <div className="flex justify-center py-1">
        {state === "recording" ? (
          <AudioSecondaryIconButton
            label={labels.stop || t("common.stop")}
            onClick={onStop}
            disabled={busy}
          >
            <Square className="size-4" />
          </AudioSecondaryIconButton>
        ) : null}
        {state === "idle" || state === "error" || state === "stopped" ? (
          <AudioPrimaryIconButton
            label={labels.start}
            onClick={() => {
              onTestStart()
              onStart()
            }}
            disabled={busy}
          >
            <Mic className="size-6" />
          </AudioPrimaryIconButton>
        ) : null}
      </div>
      {micActive ? (
        <p className="text-center text-sm text-muted-foreground">{labels.active}</p>
      ) : null}
      {error ? (
        <p className="text-center text-sm text-destructive">{error}</p>
      ) : null}
    </div>
  )
}
