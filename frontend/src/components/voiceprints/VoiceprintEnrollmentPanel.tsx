import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { AudioRecordControlsSection } from "@/components/audio/AudioRecordControlsSection"
import { Button } from "@/components/ui/button"
import { StepIndicator } from "@/components/layout/StepIndicator"
import { EnrollmentHowItWorksStep } from "@/components/voiceprints/EnrollmentHowItWorksStep"
import { EnrollmentRecordStep } from "@/components/voiceprints/EnrollmentRecordStep"
import { EnrollmentReviewStep } from "@/components/voiceprints/EnrollmentReviewStep"
import { EnrollmentSoundCheckStep } from "@/components/voiceprints/EnrollmentSoundCheckStep"
import { VoiceprintSpeakerNameField } from "@/components/voiceprints/VoiceprintSpeakerNameField"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import { useAudioUpload } from "@/hooks/useAudioUpload"
import { useEnrollVoiceprintProfileSample } from "@/hooks/useVoiceprintProfiles"
import { FinchApiError } from "@/lib/api"
import { isVoiceprintNameTaken } from "@/lib/voiceprintLabels"
import type { VoiceprintProfileSummary } from "@/lib/types"

const MIN_ENROLL_SECONDS = 2

const ENROLLMENT_STEPS = ["howItWorks", "soundCheck", "record", "review"] as const
type VoiceprintEnrollmentStep = (typeof ENROLLMENT_STEPS)[number]

type VoiceprintEnrollmentPanelProps = {
  ready: boolean
  notReadyReason?: string | null
  consentGiven: boolean
  disabled?: boolean
  /** Display name from settings — not edited in this flow. */
  profileDisplayName?: string
  /** When set, enrollment appends to this profile instead of creating a new one. */
  existingProfileId?: string | null
  profiles?: VoiceprintProfileSummary[]
  uiLanguage: "en" | "zh"
  inDialog?: boolean
  forUserProfile?: boolean
  onConsentRequired: () => void
  onEnrolled?: (voiceprintProfileId: string) => void
  onCancel?: () => void
}

export function VoiceprintEnrollmentPanel({
  ready,
  notReadyReason,
  consentGiven,
  disabled,
  profileDisplayName = "",
  existingProfileId = null,
  profiles = [],
  uiLanguage,
  inDialog = false,
  forUserProfile = false,
  onConsentRequired,
  onEnrolled,
  onCancel,
}: VoiceprintEnrollmentPanelProps) {
  const { t } = useTranslation()
  const recorder = useAudioRecorder({
    errors: {
      micDenied: t("record.errors.micDenied"),
    },
  })
  const soundCheckRecorder = useAudioRecorder({
    errors: {
      micDenied: t("record.errors.micDenied"),
    },
  })
  const { upload, isUploading } = useAudioUpload()
  const enrollMutation = useEnrollVoiceprintProfileSample()
  const [step, setStep] = useState<VoiceprintEnrollmentStep>("howItWorks")
  const [soundCheckAttempted, setSoundCheckAttempted] = useState(false)
  const [speakerDisplayName, setSpeakerDisplayName] = useState("")
  const pendingSaveRef = useRef(false)
  const advancedForBlobRef = useRef<string | null>(null)

  const resolvedDisplayName = forUserProfile
    ? profileDisplayName.trim()
    : speakerDisplayName.trim()

  useEffect(
    () => () => {
      recorder.reset()
      soundCheckRecorder.reset()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset recorders on unmount
    [],
  )

  const exampleKey =
    uiLanguage === "zh" ? "voiceprints.enrollmentExampleZh" : "voiceprints.enrollmentExampleEn"
  const exampleText = t(exampleKey)

  const busy = disabled || isUploading || enrollMutation.isPending
  const hasRecording = recorder.state === "stopped" && !!recorder.audioBlob
  const recordingLongEnough = recorder.durationSeconds >= MIN_ENROLL_SECONDS
  const hasProfileName = resolvedDisplayName.length > 0
  const enrollmentNameTaken =
    hasProfileName &&
    !existingProfileId &&
    isVoiceprintNameTaken(resolvedDisplayName, profiles)
  const canStartRecording = hasProfileName && !enrollmentNameTaken
  const canSave =
    ready &&
    hasProfileName &&
    !enrollmentNameTaken &&
    hasRecording &&
    recordingLongEnough &&
    !busy

  const displayStep =
    inDialog && step === "record" && hasRecording ? "review" : step
  const nameTakenMessage = enrollmentNameTaken ? t("voiceprints.nameTaken") : null

  const doSave = async () => {
    if (!recorder.audioBlob || !resolvedDisplayName) return

    try {
      const mimeType = recorder.audioBlob.type || "audio/webm"
      const extension = mimeType.includes("mp4") ? "m4a" : "webm"
      const file = new File([recorder.audioBlob], `voiceprint-sample.${extension}`, {
        type: mimeType,
      })
      const asset = await upload(file, "recording")
      const result = await enrollMutation.mutateAsync({
        audioAssetId: asset.id,
        displayName: resolvedDisplayName,
        profileId: existingProfileId ?? undefined,
        setAsUserProfile: forUserProfile,
      })
      toast.success(t("toasts.speakerSavedWithVoiceprint"))
      recorder.reset()
      advancedForBlobRef.current = null
      onEnrolled?.(result.profile.id)
    } catch (error) {
      const message =
        error instanceof FinchApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : t("toasts.speakerEnrollFailed")
      toast.error(message)
    }
  }

  const doSaveRef = useRef(doSave)

  useEffect(() => {
    doSaveRef.current = doSave
  })

  useEffect(() => {
    if (!consentGiven || !pendingSaveRef.current) return
    pendingSaveRef.current = false
    void doSaveRef.current()
  }, [consentGiven])

  const handleSave = async () => {
    if (!consentGiven) {
      pendingSaveRef.current = true
      onConsentRequired()
      return
    }
    await doSave()
  }

  const handleDiscard = () => {
    recorder.reset()
    soundCheckRecorder.reset()
    setSoundCheckAttempted(false)
    advancedForBlobRef.current = null
    setStep("howItWorks")
    onCancel?.()
  }

  const handleLeaveSoundCheck = () => {
    soundCheckRecorder.reset()
  }

  const handleSoundCheckContinue = () => {
    handleLeaveSoundCheck()
    recorder.reset()
    advancedForBlobRef.current = null
    setStep("record")
  }

  const soundCheckReady = soundCheckAttempted

  const handleBackToRecord = () => {
    advancedForBlobRef.current = null
    recorder.reset()
    setStep("record")
  }

  if (!ready) {
    return (
      <div className="surface-inset px-4 py-5 text-sm text-muted-foreground">
        {notReadyReason ?? t("settings.autoLabelNotReady")}
      </div>
    )
  }

  if (forUserProfile && !hasProfileName) {
    return (
      <div className="surface-inset px-4 py-5 text-sm text-muted-foreground">
        {t("voiceprints.enrollmentNameRequired")}
      </div>
    )
  }

  if (inDialog) {
    return (
      <div className="space-y-5">
        <StepIndicator
          steps={ENROLLMENT_STEPS}
          current={displayStep}
          label={(stepKey) => t(`voiceprints.enrollmentStep.${stepKey}`)}
        />

        {displayStep === "howItWorks" ? (
          <EnrollmentHowItWorksStep
            onDiscard={handleDiscard}
            onNext={() => setStep("soundCheck")}
          />
        ) : null}

        {displayStep === "soundCheck" ? (
          <EnrollmentSoundCheckStep
            state={soundCheckRecorder.state}
            mediaStream={soundCheckRecorder.mediaStream}
            audioBlob={soundCheckRecorder.audioBlob}
            error={soundCheckRecorder.error}
            busy={busy}
            soundCheckReady={soundCheckReady}
            onTestStart={() => setSoundCheckAttempted(true)}
            onStart={() => void soundCheckRecorder.start()}
            onStop={soundCheckRecorder.stop}
            onDiscard={handleDiscard}
            onBack={() => {
              handleLeaveSoundCheck()
              setStep("howItWorks")
            }}
            onContinue={handleSoundCheckContinue}
          />
        ) : null}

        {displayStep === "record" ? (
          <EnrollmentRecordStep
            forUserProfile={forUserProfile}
            profileDisplayName={profileDisplayName}
            speakerDisplayName={speakerDisplayName}
            onSpeakerDisplayNameChange={setSpeakerDisplayName}
            exampleText={exampleText}
            state={recorder.state}
            durationSeconds={recorder.durationSeconds}
            mediaStream={recorder.mediaStream}
            audioBlob={recorder.audioBlob}
            audioUrl={recorder.audioUrl}
            error={recorder.error}
            busy={busy}
            canStartRecording={canStartRecording}
            nameError={nameTakenMessage}
            onStart={() => void recorder.start()}
            onPause={recorder.pause}
            onResume={recorder.resume}
            onStop={recorder.stop}
            onDiscard={handleDiscard}
            onBack={() => {
              recorder.reset()
              advancedForBlobRef.current = null
              setStep("soundCheck")
            }}
          />
        ) : null}

        {displayStep === "review" ? (
          <EnrollmentReviewStep
            forUserProfile={forUserProfile}
            profileDisplayName={profileDisplayName}
            speakerDisplayName={speakerDisplayName}
            onSpeakerDisplayNameChange={setSpeakerDisplayName}
            audioUrl={recorder.audioUrl}
            recordingLongEnough={recordingLongEnough}
            minEnrollSeconds={MIN_ENROLL_SECONDS}
            busy={busy}
            saving={enrollMutation.isPending || isUploading}
            canSave={canSave}
            nameError={nameTakenMessage}
            onDiscard={handleDiscard}
            onRecordAgain={handleBackToRecord}
            onSave={() => void handleSave()}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className="surface-inset space-y-4 px-4 py-4">
      <div>
        <p className="text-sm font-medium text-foreground">
          {t("voiceprints.enrollmentTitle")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("voiceprints.enrollmentDescription")}
        </p>
      </div>

      <blockquote className="surface-inset px-4 py-3 text-sm leading-relaxed text-foreground">
        {exampleText}
      </blockquote>

      <VoiceprintSpeakerNameField
        forUserProfile={forUserProfile}
        profileDisplayName={profileDisplayName}
        speakerDisplayName={speakerDisplayName}
        onSpeakerDisplayNameChange={setSpeakerDisplayName}
        disabled={busy}
        nameError={nameTakenMessage}
      />

      <AudioRecordControlsSection
        state={recorder.state}
        durationSeconds={recorder.durationSeconds}
        mediaStream={recorder.mediaStream}
        audioBlob={recorder.audioBlob}
        audioUrl={recorder.audioUrl}
        error={recorder.error}
        busy={busy || !canStartRecording}
        showPreview
        onStart={() => void recorder.start()}
        onPause={recorder.pause}
        onResume={recorder.resume}
        onStop={recorder.stop}
        startLabel={t("voiceprints.enrollmentStartRecording")}
      />

      {hasRecording && !recordingLongEnough ? (
        <p className="text-sm text-muted-foreground">
          {t("voiceprints.enrollmentMinDuration", { seconds: MIN_ENROLL_SECONDS })}
        </p>
      ) : null}

      <Button
        type="button"
        onClick={() => void handleSave()}
        disabled={!canSave}
        className="w-full sm:w-auto"
      >
        {enrollMutation.isPending || isUploading
          ? t("voiceprints.enrollmentSaving")
          : t("voiceprints.enrollmentSave")}
      </Button>
    </div>
  )
}
