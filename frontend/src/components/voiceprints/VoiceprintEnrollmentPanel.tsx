import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { AudioPreview } from "@/components/audio/AudioPreview"
import { AudioDialogFooter } from "@/components/audio/AudioDialogControls"
import { AudioRecordControlsSection } from "@/components/audio/AudioRecordControlsSection"
import { AudioSoundCheckSection } from "@/components/audio/AudioSoundCheckSection"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  VoiceprintEnrollmentStepper,
  type VoiceprintEnrollmentStep,
} from "@/components/voiceprints/VoiceprintEnrollmentStepper"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import { useAudioUpload } from "@/hooks/useAudioUpload"
import { useEnrollVoiceprintProfileSample } from "@/hooks/useVoiceprintProfiles"
import { FinchApiError } from "@/lib/api"

const MIN_ENROLL_SECONDS = 2

type VoiceprintEnrollmentPanelProps = {
  open?: boolean
  ready: boolean
  notReadyReason?: string | null
  consentGiven: boolean
  disabled?: boolean
  /** Display name from settings — not edited in this flow. */
  profileDisplayName?: string
  uiLanguage: "en" | "zh"
  inDialog?: boolean
  forUserProfile?: boolean
  onConsentRequired: () => void
  onEnrolled?: (voiceprintProfileId: string) => void
  onCancel?: () => void
}

function VoiceprintSpeakerNameField({
  forUserProfile,
  profileDisplayName,
  speakerDisplayName,
  onSpeakerDisplayNameChange,
  disabled,
}: {
  forUserProfile: boolean
  profileDisplayName: string
  speakerDisplayName: string
  onSpeakerDisplayNameChange: (value: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <Label htmlFor="voiceprint-speaker-name">
        {forUserProfile
          ? t("voiceprints.enrollmentYourNameLabel")
          : t("voiceprints.enrollmentSpeakerNameLabel")}
      </Label>
      <Input
        id="voiceprint-speaker-name"
        value={forUserProfile ? profileDisplayName : speakerDisplayName}
        onChange={(event) => onSpeakerDisplayNameChange(event.target.value)}
        disabled={forUserProfile || disabled}
        placeholder={t("recording.namePlaceholder")}
      />
      {forUserProfile ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("voiceprints.enrollmentYourNameHint")}
        </p>
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("voiceprints.enrollmentSpeakerNameHint")}
        </p>
      )}
    </div>
  )
}

export function VoiceprintEnrollmentPanel({
  open = true,
  ready,
  notReadyReason,
  consentGiven,
  disabled,
  profileDisplayName = "",
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

  useEffect(() => {
    if (!inDialog) return
    if (open) {
      recorder.reset()
      soundCheckRecorder.reset()
      setStep("howItWorks")
      setSoundCheckAttempted(false)
      setSpeakerDisplayName("")
      advancedForBlobRef.current = null
      return
    }
    recorder.reset()
    soundCheckRecorder.reset()
    setStep("howItWorks")
    setSoundCheckAttempted(false)
    setSpeakerDisplayName("")
    advancedForBlobRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when dialog closes
  }, [inDialog, open])

  const exampleKey =
    uiLanguage === "zh" ? "voiceprints.enrollmentExampleZh" : "voiceprints.enrollmentExampleEn"
  const exampleText = t(exampleKey)

  const busy = disabled || isUploading || enrollMutation.isPending
  const hasRecording = recorder.state === "stopped" && !!recorder.audioBlob
  const recordingLongEnough = recorder.durationSeconds >= MIN_ENROLL_SECONDS
  const hasProfileName = resolvedDisplayName.length > 0
  const canStartRecording = hasProfileName
  const canSave =
    ready &&
    hasProfileName &&
    hasRecording &&
    recordingLongEnough &&
    !busy

  useEffect(() => {
    if (!inDialog || step !== "record" || !hasRecording || !recorder.audioBlob) return
    const blobKey = `${recorder.audioBlob.size}:${recorder.durationSeconds}`
    if (advancedForBlobRef.current === blobKey) return
    advancedForBlobRef.current = blobKey
    setStep("review")
  }, [hasRecording, inDialog, recorder.audioBlob, recorder.durationSeconds, step])

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

  useEffect(() => {
    if (!consentGiven || !pendingSaveRef.current) return
    pendingSaveRef.current = false
    void doSave()
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
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
        {notReadyReason ?? t("settings.autoLabelNotReady")}
      </div>
    )
  }

  if (forUserProfile && !hasProfileName) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
        {t("voiceprints.enrollmentNameRequired")}
      </div>
    )
  }

  if (inDialog) {
    return (
      <div className="space-y-5">
        <VoiceprintEnrollmentStepper current={step} />

        {step === "howItWorks" ? (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {t("voiceprints.enrollmentHowItWorksTitle")}
                </p>
                <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                  <li>{t("voiceprints.enrollmentHowItWorks1")}</li>
                  <li>{t("voiceprints.enrollmentHowItWorks2")}</li>
                  <li>{t("voiceprints.enrollmentHowItWorks3")}</li>
                  <li>{t("voiceprints.enrollmentHowItWorks4")}</li>
                </ul>
              </div>
            </div>
            <AudioDialogFooter className="justify-end">
              <Button type="button" variant="outline" onClick={handleDiscard}>
                {t("voiceprints.enrollmentExit")}
              </Button>
              <Button type="button" onClick={() => setStep("soundCheck")}>
                {t("voiceprints.enrollmentNext")}
              </Button>
            </AudioDialogFooter>
          </>
        ) : null}

        {step === "soundCheck" ? (
          <>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("voiceprints.enrollmentSoundCheckHint")}
              </p>

              <AudioSoundCheckSection
                state={soundCheckRecorder.state}
                mediaStream={soundCheckRecorder.mediaStream}
                audioBlob={soundCheckRecorder.audioBlob}
                error={soundCheckRecorder.error}
                busy={busy}
                onTestStart={() => setSoundCheckAttempted(true)}
                onStart={() => void soundCheckRecorder.start()}
                onStop={soundCheckRecorder.stop}
                labels={{
                  start: t("voiceprints.enrollmentSoundCheckStart"),
                  active: t("voiceprints.enrollmentSoundCheckActive"),
                  stop: t("common.stop"),
                }}
              />
            </div>

            <AudioDialogFooter className="justify-between">
              <Button type="button" variant="outline" onClick={handleDiscard}>
                {t("voiceprints.enrollmentExit")}
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    handleLeaveSoundCheck()
                    setStep("howItWorks")
                  }}
                >
                  {t("common.back")}
                </Button>
                <Button
                  type="button"
                  onClick={handleSoundCheckContinue}
                  disabled={!soundCheckReady || busy}
                >
                  {t("voiceprints.enrollmentSoundCheckContinue")}
                </Button>
              </div>
            </AudioDialogFooter>
          </>
        ) : null}

        {step === "record" ? (
          <>
            <div className="space-y-4">
              <VoiceprintSpeakerNameField
                forUserProfile={forUserProfile}
                profileDisplayName={profileDisplayName}
                speakerDisplayName={speakerDisplayName}
                onSpeakerDisplayNameChange={setSpeakerDisplayName}
                disabled={busy}
              />

              <p className="text-sm text-muted-foreground">
                {t("voiceprints.enrollmentRecordHint")}
              </p>

              <blockquote className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm leading-relaxed text-foreground">
                {exampleText}
              </blockquote>

              <AudioRecordControlsSection
                state={recorder.state}
                durationSeconds={recorder.durationSeconds}
                mediaStream={recorder.mediaStream}
                audioBlob={recorder.audioBlob}
                audioUrl={recorder.audioUrl}
                error={recorder.error}
                busy={busy || !canStartRecording}
                onStart={() => void recorder.start()}
                onPause={recorder.pause}
                onResume={recorder.resume}
                onStop={recorder.stop}
                startLabel={t("voiceprints.enrollmentStartRecording")}
              />
            </div>

            <AudioDialogFooter className="justify-between">
              <Button type="button" variant="outline" onClick={handleDiscard}>
                {t("voiceprints.enrollmentExit")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  recorder.reset()
                  advancedForBlobRef.current = null
                  setStep("soundCheck")
                }}
              >
                {t("common.back")}
              </Button>
            </AudioDialogFooter>
          </>
        ) : null}

        {step === "review" ? (
          <>
            <div className="space-y-4">
              <VoiceprintSpeakerNameField
                forUserProfile={forUserProfile}
                profileDisplayName={profileDisplayName}
                speakerDisplayName={speakerDisplayName}
                onSpeakerDisplayNameChange={setSpeakerDisplayName}
                disabled={busy}
              />

              <p className="text-sm text-muted-foreground">
                {t("voiceprints.enrollmentReviewHint")}
              </p>

              <AudioPreview audioUrl={recorder.audioUrl} />

              {!recordingLongEnough ? (
                <p className="text-sm text-muted-foreground">
                  {t("voiceprints.enrollmentMinDuration", { seconds: MIN_ENROLL_SECONDS })}
                </p>
              ) : null}
            </div>

            <AudioDialogFooter className="justify-between">
              <Button type="button" variant="outline" onClick={handleDiscard}>
                {t("voiceprints.enrollmentDiscardAndQuit")}
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" onClick={handleBackToRecord}>
                  {t("voiceprints.enrollmentRecordAgain")}
                </Button>
                <Button type="button" onClick={() => void handleSave()} disabled={!canSave}>
                  {enrollMutation.isPending || isUploading
                    ? t("voiceprints.enrollmentSaving")
                    : t("voiceprints.enrollmentSave")}
                </Button>
              </div>
            </AudioDialogFooter>
          </>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/10 px-4 py-4">
      <div>
        <p className="text-sm font-medium text-foreground">
          {t("voiceprints.enrollmentTitle")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("voiceprints.enrollmentDescription")}
        </p>
      </div>

      <blockquote className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm leading-relaxed text-foreground">
        {exampleText}
      </blockquote>

      <VoiceprintSpeakerNameField
        forUserProfile={forUserProfile}
        profileDisplayName={profileDisplayName}
        speakerDisplayName={speakerDisplayName}
        onSpeakerDisplayNameChange={setSpeakerDisplayName}
        disabled={busy}
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
