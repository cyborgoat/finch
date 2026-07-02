import { Pause, Play, Square } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useTranslation } from "react-i18next"
import { MiniAudioWaveform } from "@/components/audio/MiniAudioWaveform"
import { useRecordingSession } from "@/components/audio/RecordingSessionProvider"
import { useNewRecordingDialogs } from "@/components/layout/NewRecordingDialogs"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export function FloatingRecordingBar() {
  const { t } = useTranslation()
  const session = useRecordingSession()
  const { openRecordDialog } = useNewRecordingDialogs()

  const isActive =
    session.state === "recording" ||
    session.state === "paused" ||
    (session.state === "stopped" && !!session.audioBlob)

  const isRecording = session.state === "recording"
  const isPaused = session.state === "paused"
  const isStopped = session.state === "stopped" && !!session.audioBlob

  const statusLabel = isRecording
    ? t("record.indicator.recording")
    : isPaused
      ? t("record.indicator.paused")
      : t("record.indicator.stopped")

  return (
    <AnimatePresence>
      {isActive ? (
        <motion.div
          key="floating-recording-bar"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "pointer-events-none fixed inset-x-0 bottom-0 z-50",
            "flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2",
          )}
        >
          <div
            role="region"
            aria-label={t("record.floatingBarAriaLabel")}
            className={cn(
              "pointer-events-auto flex w-full max-w-2xl items-center gap-3",
              "rounded-2xl border border-border/80 bg-card/95 p-2 pl-3 shadow-lg",
              "ring-1 ring-black/5 backdrop-blur-md dark:ring-white/10",
            )}
          >
            <button
              type="button"
              onClick={openRecordDialog}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left transition-colors hover:bg-muted/50"
            >
              <span
                className={cn(
                  "size-2.5 shrink-0 rounded-full",
                  isRecording ? "animate-pulse bg-red-500" : "bg-muted-foreground",
                )}
                aria-hidden
              />
              <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">
                {formatTimer(session.durationSeconds)}
              </span>
              <MiniAudioWaveform
                state={session.state}
                stream={session.mediaStream}
                className="h-8 min-w-28 flex-1 overflow-hidden rounded-lg bg-muted/40 sm:min-w-36"
              />
              <span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">
                {statusLabel}
              </span>
            </button>

            <div className="h-8 w-px shrink-0 bg-border/80" aria-hidden />

            {isStopped ? (
              <div className="flex shrink-0 items-center gap-1.5 pr-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={session.reset}
                  disabled={session.isSaving}
                >
                  {t("record.discardRecording")}
                </Button>
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => void session.saveRecording()}
                  disabled={session.isSaving}
                >
                  {session.isSaving ? t("common.saving") : t("record.saveRecording")}
                </Button>
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-0.5 pr-1">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className="inline-flex">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={
                            isRecording ? t("common.pause") : t("common.resume")
                          }
                          onClick={isRecording ? session.pause : session.resume}
                        >
                          {isRecording ? (
                            <Pause className="size-4" />
                          ) : (
                            <Play className="size-4" />
                          )}
                        </Button>
                      </span>
                    }
                  />
                  <TooltipContent side="top">
                    {isRecording ? t("common.pause") : t("common.resume")}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className="inline-flex">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t("common.stop")}
                          onClick={session.stop}
                        >
                          <Square className="size-4" />
                        </Button>
                      </span>
                    }
                  />
                  <TooltipContent side="top">{t("common.stop")}</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
