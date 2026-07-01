import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { AudioPreview } from "@/components/audio/AudioPreview"
import { AudioWaveform } from "@/components/audio/AudioWaveform"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import { useAudioUpload } from "@/hooks/useAudioUpload"
import { useEnrollVoiceprintProfileSample } from "@/hooks/useVoiceprintProfiles"
import { FinchApiError } from "@/lib/api"

const MIN_ENROLL_SECONDS = 2

type VoiceprintEnrollmentPanelProps = {
  ready: boolean
  notReadyReason?: string | null
  consentGiven: boolean
  disabled?: boolean
  defaultDisplayName?: string
  uiLanguage: "en" | "zh"
  inDialog?: boolean
  forUserProfile?: boolean
  onConsentRequired: () => void
  onEnrolled?: (voiceprintProfileId: string) => void
}

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export function VoiceprintEnrollmentPanel({
  ready,
  notReadyReason,
  consentGiven,
  disabled,
  defaultDisplayName = "",
  uiLanguage,
  inDialog = false,
  forUserProfile = false,
  onConsentRequired,
  onEnrolled,
}: VoiceprintEnrollmentPanelProps) {
  const { t } = useTranslation()
  const recorder = useAudioRecorder()
  const { upload, isUploading } = useAudioUpload()
  const enrollMutation = useEnrollVoiceprintProfileSample()
  const [displayName, setDisplayName] = useState(defaultDisplayName)
  const [setAsUserProfile, setSetAsUserProfile] = useState(forUserProfile)
  const pendingSaveRef = useRef(false)

  useEffect(() => {
    setDisplayName(defaultDisplayName)
  }, [defaultDisplayName])

  useEffect(() => {
    if (forUserProfile) {
      setSetAsUserProfile(true)
    }
  }, [forUserProfile])

  const exampleKey =
    uiLanguage === "zh" ? "voiceprints.enrollmentExampleZh" : "voiceprints.enrollmentExampleEn"
  const exampleText = t(exampleKey)

  const busy = disabled || isUploading || enrollMutation.isPending
  const hasRecording = recorder.state === "stopped" && !!recorder.audioBlob
  const recordingLongEnough = recorder.durationSeconds >= MIN_ENROLL_SECONDS
  const canSave =
    ready &&
    hasRecording &&
    recordingLongEnough &&
    displayName.trim().length > 0 &&
    !busy

  const doSave = async () => {
    if (!recorder.audioBlob) return

    const trimmedName = displayName.trim()
    if (!trimmedName) return

    try {
      const mimeType = recorder.audioBlob.type || "audio/webm"
      const extension = mimeType.includes("mp4") ? "m4a" : "webm"
      const file = new File([recorder.audioBlob], `voiceprint-sample.${extension}`, {
        type: mimeType,
      })
      const asset = await upload(file, "recording")
      const result = await enrollMutation.mutateAsync({
        audioAssetId: asset.id,
        displayName: trimmedName,
        setAsUserProfile: forUserProfile || setAsUserProfile,
      })
      toast.success(t("toasts.speakerSavedWithVoiceprint"))
      recorder.reset()
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

  if (!ready) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
        {notReadyReason ?? t("settings.autoLabelNotReady")}
      </div>
    )
  }

  return (
    <div className={inDialog ? "space-y-4" : "space-y-4 rounded-lg border border-border bg-muted/10 px-4 py-4"}>
      {!inDialog ? (
        <div>
          <p className="text-sm font-medium text-foreground">
            {t("voiceprints.enrollmentTitle")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("voiceprints.enrollmentDescription")}
          </p>
        </div>
      ) : null}

      <blockquote className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm leading-relaxed text-foreground">
        {exampleText}
      </blockquote>

      <div className="field-stack">
        <Label htmlFor="voiceprint-display-name">{t("common.displayName")}</Label>
        <Input
          id="voiceprint-display-name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder={t("settings.yourNamePlaceholder")}
          disabled={busy}
        />
      </div>

      <div className="space-y-3 rounded-md border border-border bg-muted/10 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-lg tabular-nums">
            {formatTimer(recorder.durationSeconds)}
          </span>
          <span className="text-sm capitalize text-muted-foreground">
            {t(`record.state.${recorder.state}`)}
          </span>
        </div>
        <AudioWaveform
          state={recorder.state}
          stream={recorder.mediaStream}
          audioBlob={recorder.audioBlob}
        />
        <div className="flex flex-wrap gap-2">
          {recorder.state === "idle" || recorder.state === "error" ? (
            <Button
              type="button"
              size="sm"
              onClick={() => void recorder.start()}
              disabled={busy}
            >
              {t("voiceprints.enrollmentStartRecording")}
            </Button>
          ) : null}
          {recorder.state === "recording" ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={recorder.pause}
                disabled={busy}
              >
                {t("common.pause")}
              </Button>
              <Button type="button" size="sm" onClick={recorder.stop} disabled={busy}>
                {t("common.stop")}
              </Button>
            </>
          ) : null}
          {recorder.state === "paused" ? (
            <>
              <Button type="button" size="sm" onClick={recorder.resume} disabled={busy}>
                {t("common.resume")}
              </Button>
              <Button type="button" size="sm" onClick={recorder.stop} disabled={busy}>
                {t("common.stop")}
              </Button>
            </>
          ) : null}
          {hasRecording ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={recorder.reset}
              disabled={busy}
            >
              {t("common.reset")}
            </Button>
          ) : null}
        </div>
        {recorder.error ? (
          <p className="text-sm text-destructive">{recorder.error}</p>
        ) : null}
        {hasRecording && !recordingLongEnough ? (
          <p className="text-sm text-muted-foreground">
            {t("voiceprints.enrollmentMinDuration", { seconds: MIN_ENROLL_SECONDS })}
          </p>
        ) : null}
        <AudioPreview audioUrl={recorder.audioUrl} />
      </div>

      {!forUserProfile ? (
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label htmlFor="voiceprint-set-as-user">{t("voiceprints.enrollmentSetAsYou")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("voiceprints.enrollmentSetAsYouDescription")}
            </p>
          </div>
          <Switch
            id="voiceprint-set-as-user"
            checked={setAsUserProfile}
            onCheckedChange={setSetAsUserProfile}
            disabled={busy}
          />
        </div>
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
