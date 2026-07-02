import { Mic, Pause, Play, Square } from "lucide-react"
import { useTranslation } from "react-i18next"
import { AudioPreview } from "@/components/audio/AudioPreview"
import { AudioWaveform } from "@/components/audio/AudioWaveform"
import {
  AudioPrimaryIconButton,
  AudioSecondaryIconButton,
} from "@/components/audio/AudioDialogControls"
import type { RecorderState } from "@/hooks/useAudioRecorder"

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

type AudioRecordControlsSectionProps = {
  state: RecorderState
  durationSeconds: number
  mediaStream: MediaStream | null
  audioBlob: Blob | null
  audioUrl: string | null
  error: string | null
  busy?: boolean
  showPreview?: boolean
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  startLabel: string
}

export function AudioRecordControlsSection({
  state,
  durationSeconds,
  mediaStream,
  audioBlob,
  audioUrl,
  error,
  busy,
  showPreview = false,
  onStart,
  onPause,
  onResume,
  onStop,
  startLabel,
}: AudioRecordControlsSectionProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-lg tabular-nums">
          {formatTimer(durationSeconds)}
        </span>
        <span className="text-sm capitalize text-muted-foreground">
          {t(`record.state.${state}`)}
        </span>
      </div>
      <AudioWaveform state={state} stream={mediaStream} audioBlob={audioBlob} />
      <div className="flex justify-center gap-3 py-1">
        {state === "idle" || state === "error" ? (
          <AudioPrimaryIconButton
            label={startLabel}
            onClick={onStart}
            disabled={busy}
          >
            <Mic className="size-6" />
          </AudioPrimaryIconButton>
        ) : null}
        {state === "recording" ? (
          <>
            <AudioSecondaryIconButton
              label={t("common.pause")}
              onClick={onPause}
              disabled={busy}
            >
              <Pause className="size-4" />
            </AudioSecondaryIconButton>
            <AudioSecondaryIconButton
              label={t("common.stop")}
              onClick={onStop}
              disabled={busy}
            >
              <Square className="size-4" />
            </AudioSecondaryIconButton>
          </>
        ) : null}
        {state === "paused" ? (
          <>
            <AudioSecondaryIconButton
              label={t("common.resume")}
              onClick={onResume}
              disabled={busy}
            >
              <Play className="size-4" />
            </AudioSecondaryIconButton>
            <AudioSecondaryIconButton
              label={t("common.stop")}
              onClick={onStop}
              disabled={busy}
            >
              <Square className="size-4" />
            </AudioSecondaryIconButton>
          </>
        ) : null}
      </div>
      {error ? (
        <p className="text-center text-sm text-destructive">{error}</p>
      ) : null}
      {showPreview && audioUrl ? <AudioPreview audioUrl={audioUrl} /> : null}
    </div>
  )
}
