import { useTranslation } from "react-i18next"
import { AudioDialogFooter } from "@/components/audio/AudioDialogControls"
import { AudioRecordControlsSection } from "@/components/audio/AudioRecordControlsSection"
import { Button } from "@/components/ui/button"
import type { RecorderState } from "@/hooks/useAudioRecorder"
import { VoiceprintSpeakerNameField } from "@/components/voiceprints/VoiceprintSpeakerNameField"

type EnrollmentRecordStepProps = {
  forUserProfile: boolean
  profileDisplayName: string
  speakerDisplayName: string
  onSpeakerDisplayNameChange: (value: string) => void
  exampleText: string
  state: RecorderState
  durationSeconds: number
  mediaStream: MediaStream | null
  audioBlob: Blob | null
  audioUrl: string | null
  error: string | null
  busy?: boolean
  canStartRecording: boolean
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onDiscard: () => void
  onBack: () => void
}

export function EnrollmentRecordStep({
  forUserProfile,
  profileDisplayName,
  speakerDisplayName,
  onSpeakerDisplayNameChange,
  exampleText,
  state,
  durationSeconds,
  mediaStream,
  audioBlob,
  audioUrl,
  error,
  busy,
  canStartRecording,
  onStart,
  onPause,
  onResume,
  onStop,
  onDiscard,
  onBack,
}: EnrollmentRecordStepProps) {
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
          {t("voiceprints.enrollmentRecordHint")}
        </p>

        <blockquote className="surface-inset px-4 py-3 text-sm leading-relaxed text-foreground">
          {exampleText}
        </blockquote>

        <AudioRecordControlsSection
          state={state}
          durationSeconds={durationSeconds}
          mediaStream={mediaStream}
          audioBlob={audioBlob}
          audioUrl={audioUrl}
          error={error}
          busy={busy || !canStartRecording}
          embedded
          onStart={onStart}
          onPause={onPause}
          onResume={onResume}
          onStop={onStop}
          startLabel={t("voiceprints.enrollmentStartRecording")}
        />
      </div>

      <AudioDialogFooter className="justify-between">
        <Button type="button" variant="outline" onClick={onDiscard}>
          {t("voiceprints.enrollmentExit")}
        </Button>
        <Button type="button" variant="ghost" onClick={onBack}>
          {t("common.back")}
        </Button>
      </AudioDialogFooter>
    </>
  )
}
