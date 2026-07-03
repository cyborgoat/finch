import { useTranslation } from "react-i18next"
import { AudioDialogFooter } from "@/components/audio/AudioDialogControls"
import { AudioPreview } from "@/components/audio/AudioPreview"
import { Button } from "@/components/ui/button"
import { VoiceprintSpeakerNameField } from "@/components/voiceprints/VoiceprintSpeakerNameField"

type EnrollmentReviewStepProps = {
  forUserProfile: boolean
  profileDisplayName: string
  speakerDisplayName: string
  onSpeakerDisplayNameChange: (value: string) => void
  audioUrl: string | null
  recordingLongEnough: boolean
  minEnrollSeconds: number
  busy?: boolean
  saving?: boolean
  canSave: boolean
  onDiscard: () => void
  onRecordAgain: () => void
  onSave: () => void
}

export function EnrollmentReviewStep({
  forUserProfile,
  profileDisplayName,
  speakerDisplayName,
  onSpeakerDisplayNameChange,
  audioUrl,
  recordingLongEnough,
  minEnrollSeconds,
  busy,
  saving,
  canSave,
  onDiscard,
  onRecordAgain,
  onSave,
}: EnrollmentReviewStepProps) {
  const { t } = useTranslation()

  return (
    <>
      <div className="space-y-4">
        <VoiceprintSpeakerNameField
          forUserProfile={forUserProfile}
          profileDisplayName={profileDisplayName}
          speakerDisplayName={speakerDisplayName}
          onSpeakerDisplayNameChange={onSpeakerDisplayNameChange}
          disabled={busy}
        />

        <p className="text-sm text-muted-foreground">
          {t("voiceprints.enrollmentReviewHint")}
        </p>

        <AudioPreview audioUrl={audioUrl} embedded />

        {!recordingLongEnough ? (
          <p className="text-sm text-muted-foreground">
            {t("voiceprints.enrollmentMinDuration", { seconds: minEnrollSeconds })}
          </p>
        ) : null}
      </div>

      <AudioDialogFooter className="justify-between">
        <Button type="button" variant="outline" onClick={onDiscard}>
          {t("voiceprints.enrollmentDiscardAndQuit")}
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={onRecordAgain}>
            {t("voiceprints.enrollmentRecordAgain")}
          </Button>
          <Button type="button" onClick={onSave} disabled={!canSave}>
            {saving ? t("voiceprints.enrollmentSaving") : t("voiceprints.enrollmentSave")}
          </Button>
        </div>
      </AudioDialogFooter>
    </>
  )
}
