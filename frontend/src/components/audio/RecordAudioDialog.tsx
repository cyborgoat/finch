import { useState } from "react"
import { useTranslation } from "react-i18next"
import { LongRecordingHint } from "@/components/audio/LongRecordingHint"
import { AudioPreview } from "@/components/audio/AudioPreview"
import { AudioDialogFooter } from "@/components/audio/AudioDialogControls"
import { AudioRecordControlsSection } from "@/components/audio/AudioRecordControlsSection"
import { StepIndicator } from "@/components/layout/StepIndicator"
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

const RECORD_AUDIO_STEPS = ["record", "save"] as const
type RecordAudioStep = (typeof RECORD_AUDIO_STEPS)[number]

function resolveStepForSession(
  state: ReturnType<typeof useRecordingSession>["state"],
  hasRecording: boolean,
): RecordAudioStep {
  if (hasRecording) return "save"
  return "record"
}

type RecordAudioDialogContentProps = {
  onOpenChange: (open: boolean) => void
}

function RecordAudioDialogContent({ onOpenChange }: RecordAudioDialogContentProps) {
  const { t } = useTranslation()
  const session = useRecordingSession()
  const hasRecording = session.state === "stopped" && !!session.audioBlob
  const [step, setStep] = useState<RecordAudioStep>(() =>
    resolveStepForSession(session.state, hasRecording),
  )
  const displayStep = step === "record" && hasRecording ? "save" : step
  const canConfigureCapture = session.state === "idle" || session.state === "error"

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (session.state === "idle" || session.state === "error")) {
      session.reset()
    }
    onOpenChange(nextOpen)
  }

  const handleDiscard = () => {
    session.reset()
    setStep("record")
    handleOpenChange(false)
  }

  const handleRecordAgain = () => {
    session.reset()
    setStep("record")
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("record.dialogTitle")}</DialogTitle>
        <DialogDescription>{t("record.dialogDescription")}</DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        <StepIndicator
          steps={RECORD_AUDIO_STEPS}
          current={displayStep}
          label={(stepKey) => t(`record.step.${stepKey}`)}
        />

        {displayStep === "record" ? (
          <>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("record.recordHint")}</p>
              <LongRecordingHint
                durationSeconds={session.durationSeconds}
                durationLimitReached={session.durationLimitReached}
              />

              {canConfigureCapture ? (
                <div className="surface-inset space-y-3 p-3">
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
                    <div className="surface-inset space-y-2 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
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
                embedded
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

        {displayStep === "save" ? (
          <>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("record.saveHint")}</p>
              <AudioPreview audioUrl={session.audioUrl} embedded />
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
    </>
  )
}

export function RecordAudioDialog({ open, onOpenChange }: RecordAudioDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        {open ? <RecordAudioDialogContent onOpenChange={onOpenChange} /> : null}
      </DialogContent>
    </Dialog>
  )
}
