import { useTranslation } from "react-i18next"
import { AudioDialogFooter } from "@/components/audio/AudioDialogControls"
import { AudioSoundCheckSection } from "@/components/audio/AudioSoundCheckSection"
import { Button } from "@/components/ui/button"
import type { RecorderState } from "@/hooks/useAudioRecorder"

type EnrollmentSoundCheckStepProps = {
  state: RecorderState
  mediaStream: MediaStream | null
  audioBlob: Blob | null
  error: string | null
  busy?: boolean
  soundCheckReady: boolean
  onTestStart: () => void
  onStart: () => void
  onStop: () => void
  onDiscard: () => void
  onBack: () => void
  onContinue: () => void
}

export function EnrollmentSoundCheckStep({
  state,
  mediaStream,
  audioBlob,
  error,
  busy,
  soundCheckReady,
  onTestStart,
  onStart,
  onStop,
  onDiscard,
  onBack,
  onContinue,
}: EnrollmentSoundCheckStepProps) {
  const { t } = useTranslation()

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("voiceprints.enrollmentSoundCheckHint")}
        </p>

        <AudioSoundCheckSection
          state={state}
          mediaStream={mediaStream}
          audioBlob={audioBlob}
          error={error}
          busy={busy}
          embedded
          onTestStart={onTestStart}
          onStart={onStart}
          onStop={onStop}
          labels={{
            start: t("voiceprints.enrollmentSoundCheckStart"),
            active: t("voiceprints.enrollmentSoundCheckActive"),
            stop: t("common.stop"),
          }}
        />
      </div>

      <AudioDialogFooter className="justify-between">
        <Button type="button" variant="outline" onClick={onDiscard}>
          {t("voiceprints.enrollmentExit")}
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={onBack}>
            {t("common.back")}
          </Button>
          <Button type="button" onClick={onContinue} disabled={!soundCheckReady || busy}>
            {t("voiceprints.enrollmentSoundCheckContinue")}
          </Button>
        </div>
      </AudioDialogFooter>
    </>
  )
}
