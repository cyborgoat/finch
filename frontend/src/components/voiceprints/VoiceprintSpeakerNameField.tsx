import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type VoiceprintSpeakerNameFieldProps = {
  forUserProfile: boolean
  profileDisplayName: string
  speakerDisplayName: string
  onSpeakerDisplayNameChange: (value: string) => void
  disabled?: boolean
  nameError?: string | null
}

export function VoiceprintSpeakerNameField({
  forUserProfile,
  profileDisplayName,
  speakerDisplayName,
  onSpeakerDisplayNameChange,
  disabled,
  nameError,
}: VoiceprintSpeakerNameFieldProps) {
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
      {nameError ? <p className="text-xs text-destructive">{nameError}</p> : null}
    </div>
  )
}
