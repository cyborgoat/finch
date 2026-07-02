import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { AudioPreview } from "@/components/audio/AudioPreview"
import { AudioDialogFooter } from "@/components/audio/AudioDialogControls"
import { AudioRecordControlsSection } from "@/components/audio/AudioRecordControlsSection"
import {
  RecordAudioStepper,
  type RecordAudioStep,
} from "@/components/audio/RecordAudioStepper"
import { useRecordingSession } from "@/components/audio/RecordingSessionProvider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type RecordAudioDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function resolveStepForSession(
  state: ReturnType<typeof useRecordingSession>["state"],
  hasRecording: boolean,
): RecordAudioStep {
  if (hasRecording) return "save"
  return "record"
}

export function RecordAudioDialog({ open, onOpenChange }: RecordAudioDialogProps) {
  const { t } = useTranslation()
  const session = useRecordingSession()
  const [step, setStep] = useState<RecordAudioStep>("record")
  const advancedForBlobRef = useRef<string | null>(null)

  const hasRecording = session.state === "stopped" && !!session.audioBlob
  const canConfigureCapture = session.state === "idle" || session.state === "error"

  useEffect(() => {
    if (!open) {
      advancedForBlobRef.current = null
      return
    }

    setStep(resolveStepForSession(session.state, hasRecording))
    advancedForBlobRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when dialog opens
  }, [open])

  useEffect(() => {
    if (!open || step !== "record" || !hasRecording || !session.audioBlob) return
    const blobKey = `${session.audioBlob.size}:${session.durationSeconds}`
    if (advancedForBlobRef.current === blobKey) return
    advancedForBlobRef.current = blobKey
    setStep("save")
  }, [hasRecording, open, session.audioBlob, session.durationSeconds, step])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (session.state === "idle" || session.state === "error")) {
      session.reset()
      setStep("record")
    }
    onOpenChange(nextOpen)
  }

  const handleDiscard = () => {
    session.reset()
    advancedForBlobRef.current = null
    setStep("record")
    handleOpenChange(false)
  }

  const handleRecordAgain = () => {
    advancedForBlobRef.current = null
    session.reset()
    setStep("record")
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("record.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("record.dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <RecordAudioStepper current={step} />

          {step === "record" ? (
            <>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t("record.recordHint")}</p>

                {canConfigureCapture ? (
                  <div className="space-y-3 rounded-lg border border-border/60 p-3">
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
                    {session.includeSystemAudio ? (
                      <div className="space-y-2 rounded-md border border-border/50 bg-muted/20 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
                        <p className="font-medium text-foreground">
                          {t("record.includeSystemAudioInstructionsTitle")}
                        </p>
                        <ol className="list-decimal space-y-1.5 pl-4">
                          <li>{t("record.includeSystemAudioInstructions1")}</li>
                          <li>{t("record.includeSystemAudioInstructions2")}</li>
                          <li>{t("record.includeSystemAudioInstructions3")}</li>
                        </ol>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <AudioRecordControlsSection
                  state={session.state}
                  durationSeconds={session.durationSeconds}
                  mediaStream={session.mediaStream}
                  audioBlob={session.audioBlob}
                  audioUrl={session.audioUrl}
                  error={session.error}
                  busy={session.isSaving}
                  onStart={() => void session.start()}
                  onPause={session.pause}
                  onResume={session.resume}
                  onStop={session.stop}
                  startLabel={t("record.startRecording")}
                />
              </div>
              <AudioDialogFooter className="justify-end">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  {t("common.cancel")}
                </Button>
              </AudioDialogFooter>
            </>
          ) : null}

          {step === "save" ? (
            <>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t("record.saveHint")}</p>
                <AudioPreview audioUrl={session.audioUrl} />
              </div>
              <AudioDialogFooter className="justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDiscard}
                  disabled={session.isSaving}
                >
                  {t("record.discardRecording")}
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleRecordAgain}
                    disabled={session.isSaving}
                  >
                    {t("record.recordAgain")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void session.saveRecording()}
                    disabled={session.isSaving}
                  >
                    {session.isSaving ? t("common.saving") : t("record.saveRecording")}
                  </Button>
                </div>
              </AudioDialogFooter>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
