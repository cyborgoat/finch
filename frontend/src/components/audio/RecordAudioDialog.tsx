import { useTranslation } from "react-i18next"
import { AudioPreview } from "@/components/audio/AudioPreview"
import { AudioWaveform } from "@/components/audio/AudioWaveform"
import { useRecordingSession } from "@/components/audio/RecordingSessionProvider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type RecordAudioDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export function RecordAudioDialog({ open, onOpenChange }: RecordAudioDialogProps) {
  const { t } = useTranslation()
  const session = useRecordingSession()

  const isRecording = session.state === "recording"
  const isPaused = session.state === "paused"
  const hasRecording = session.state === "stopped" && !!session.audioUrl
  const canConfigureCapture = session.state === "idle" || session.state === "error"

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (session.state === "idle" || session.state === "error")) {
      session.reset()
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("record.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("record.dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {canConfigureCapture ? (
            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="dialog-include-system-audio" className="text-sm font-normal">
                  {t("record.includeSystemAudio")}
                </Label>
                <Switch
                  id="dialog-include-system-audio"
                  checked={session.includeSystemAudio}
                  onCheckedChange={session.setIncludeSystemAudio}
                  aria-label={t("record.includeSystemAudio")}
                />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("record.includeSystemAudioHint")}
              </p>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <span className="font-mono text-2xl tabular-nums">
              {formatTimer(session.durationSeconds)}
            </span>
            <span className="text-sm capitalize text-muted-foreground">
              {t(`record.state.${session.state}`)}
            </span>
          </div>

          <AudioWaveform
            state={session.state}
            stream={session.mediaStream}
            audioBlob={session.audioBlob}
          />

          {session.error ? (
            <p className="text-sm text-destructive">{session.error}</p>
          ) : null}

          {hasRecording ? <AudioPreview audioUrl={session.audioUrl} /> : null}
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:justify-start">
          {session.state === "idle" || session.state === "error" ? (
            <Button onClick={() => void session.start()}>
              {t("record.startRecording")}
            </Button>
          ) : null}
          {isRecording ? (
            <>
              <Button variant="outline" onClick={session.pause}>
                {t("common.pause")}
              </Button>
              <Button onClick={session.stop}>{t("common.stop")}</Button>
            </>
          ) : null}
          {isPaused ? (
            <>
              <Button onClick={session.resume}>{t("common.resume")}</Button>
              <Button onClick={session.stop}>{t("common.stop")}</Button>
            </>
          ) : null}
          {hasRecording ? (
            <>
              <Button
                onClick={() => void session.saveRecording()}
                disabled={session.isSaving}
              >
                {session.isSaving ? t("common.saving") : t("recording.saveRecording")}
              </Button>
              <Button
                variant="ghost"
                onClick={session.reset}
                disabled={session.isSaving}
              >
                {t("recording.discardRecording")}
              </Button>
            </>
          ) : null}
          {(session.state === "idle" || session.state === "error") && !hasRecording ? (
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              {t("common.cancel")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
