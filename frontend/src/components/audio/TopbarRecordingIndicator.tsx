import { Pause, Play, Square } from "lucide-react"
import { useTranslation } from "react-i18next"
import { MiniAudioWaveform } from "@/components/audio/MiniAudioWaveform"
import { useRecordingSession } from "@/components/audio/RecordingSessionProvider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

type TopbarRecordingIndicatorProps = {
  onExpand: () => void
  onSave: () => void
  onDiscard: () => void
}

export function TopbarRecordingIndicator({
  onExpand,
  onSave,
  onDiscard,
}: TopbarRecordingIndicatorProps) {
  const { t } = useTranslation()
  const session = useRecordingSession()

  const isActive =
    session.state === "recording" ||
    session.state === "paused" ||
    (session.state === "stopped" && !!session.audioBlob)

  if (!isActive) return null

  const isRecording = session.state === "recording"
  const isPaused = session.state === "paused"
  const isStopped = session.state === "stopped" && !!session.audioBlob

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-border/80 bg-card/95 px-3 py-1.5 shadow-sm backdrop-blur-sm",
        "max-w-[min(100%,28rem)]",
      )}
    >
      <button
        type="button"
        onClick={onExpand}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            isRecording ? "animate-pulse bg-red-500" : "bg-muted-foreground",
          )}
          aria-hidden
        />
        <span className="shrink-0 font-mono text-xs tabular-nums text-foreground">
          {formatTimer(session.durationSeconds)}
        </span>
        <MiniAudioWaveform
          state={session.state}
          stream={session.mediaStream}
          className="h-7 min-w-24 flex-1 overflow-hidden rounded-md bg-muted/40"
        />
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
          {isRecording
            ? t("record.indicator.recording")
            : isPaused
              ? t("record.indicator.paused")
              : t("record.indicator.stopped")}
        </span>
      </button>

      {isStopped ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={onDiscard}
            disabled={session.isSaving}
          >
            {t("record.discardRecording")}
          </Button>
          <Button
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onSave}
            disabled={session.isSaving}
          >
            {session.isSaving ? t("common.saving") : t("record.saveRecording")}
          </Button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-0.5">
          {isRecording ? (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={t("common.pause")}
              onClick={session.pause}
            >
              <Pause className="size-3.5" />
            </Button>
          ) : (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={t("common.resume")}
              onClick={session.resume}
            >
              <Play className="size-3.5" />
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t("common.stop")}
            onClick={session.stop}
          >
            <Square className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
