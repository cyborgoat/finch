import { useEffect, useState } from "react"
import { AudioLines } from "lucide-react"
import { useTranslation } from "react-i18next"
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsSection"
import { VoiceprintEnrollmentDialog } from "@/components/voiceprints/VoiceprintEnrollmentDialog"
import { SettingsWarningBadge } from "@/components/settings/settingsBadges"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { UserPreferences } from "@/lib/userPreferences"
import type { VoiceprintProfileSummary } from "@/lib/types"

type UserProfileSettingsProps = {
  preferences: UserPreferences
  profiles: VoiceprintProfileSummary[]
  ready: boolean
  disabled?: boolean
  voiceprintReady: boolean
  voiceprintNotReadyReason?: string | null
  voiceprintConsentGiven: boolean
  onVoiceprintConsentRequired: () => void
  onUpdate: (
    patch: Partial<UserPreferences>,
    successMessage?: string,
  ) => void | Promise<void>
}

export function UserProfileSettings({
  preferences,
  profiles,
  ready,
  disabled,
  voiceprintReady,
  voiceprintNotReadyReason,
  voiceprintConsentGiven,
  onVoiceprintConsentRequired,
  onUpdate,
}: UserProfileSettingsProps) {
  const { t } = useTranslation()
  const [nameDraft, setNameDraft] = useState(preferences.userName)
  const [enrollOpen, setEnrollOpen] = useState(false)

  useEffect(() => {
    setNameDraft(preferences.userName)
  }, [preferences.userName])

  useEffect(() => {
    if (!preferences.userVoiceprintProfileId) return
    const exists = profiles.some(
      (profile) => profile.id === preferences.userVoiceprintProfileId,
    )
    if (!exists) {
      void onUpdate({ userVoiceprintProfileId: null })
    }
  }, [onUpdate, preferences.userVoiceprintProfileId, profiles])

  const linkedProfile = profiles.find(
    (profile) => profile.id === preferences.userVoiceprintProfileId,
  )
  const hasLinkedProfile = Boolean(linkedProfile)

  const commitName = () => {
    const trimmed = nameDraft.trim()
    if (trimmed === preferences.userName) return
    void onUpdate({ userName: trimmed })
  }

  const controlsDisabled = !ready || disabled
  const enrollDisabled =
    controlsDisabled || !voiceprintReady || !preferences.userName.trim()

  return (
    <>
      <SettingsSection
        title={t("settings.youTitle")}
        description={t("settings.youDescription")}
      >
        <SettingsRow
          label={t("settings.yourNameLabel")}
          description={t("settings.yourNameDescription")}
        >
          <Input
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur()
              }
            }}
            placeholder={t("settings.yourNamePlaceholder")}
            disabled={controlsDisabled}
            autoComplete="name"
          />
        </SettingsRow>
        <SettingsRow
          label={t("settings.yourSpeakerLabel")}
          labelAdornment={
            !hasLinkedProfile ? (
              <SettingsWarningBadge>{t("settings.voiceprintNotRecorded")}</SettingsWarningBadge>
            ) : null
          }
          description={
            hasLinkedProfile
              ? t("settings.yourSpeakerDescriptionLinked")
              : t("settings.yourSpeakerDescriptionUnlinked")
          }
        >
          <div className="flex w-full justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={enrollDisabled}
              onClick={() => setEnrollOpen(true)}
            >
              <AudioLines />
              {t("settings.recordVoiceprint")}
            </Button>
          </div>
        </SettingsRow>
      </SettingsSection>

      <VoiceprintEnrollmentDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        ready={voiceprintReady}
        notReadyReason={voiceprintNotReadyReason}
        consentGiven={voiceprintConsentGiven}
        disabled={controlsDisabled}
        profileDisplayName={preferences.userName}
        uiLanguage={preferences.uiLanguage}
        forUserProfile
        onConsentRequired={onVoiceprintConsentRequired}
        onEnrolled={(voiceprintProfileId) => {
          void onUpdate({ userVoiceprintProfileId: voiceprintProfileId })
        }}
      />
    </>
  )
}
