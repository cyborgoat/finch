import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { SettingsAiNotesSection } from "@/components/settings/SettingsAiNotesSection"
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsSection"
import {
  SettingsVoiceprintSection,
  type VoiceprintConsentPurpose,
} from "@/components/settings/SettingsVoiceprintSection"
import { UserProfileSettings } from "@/components/settings/UserProfileSettings"
import { LlmSettingsPanel } from "@/components/settings/LlmSettingsPanel"
import { TranscriptionSettingsPanel } from "@/components/settings/TranscriptionSettingsPanel"
import { VoiceprintConsentDialog } from "@/components/voiceprints/VoiceprintConsentDialog"
import { PageContainer } from "@/components/layout/PageContainer"
import { BlurFade } from "@/components/motion-primitives/blur-fade"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  useRecordVoiceprintConsent,
  useToggleVoiceprintProfiles,
  useVoiceprintProfiles,
  useVoiceprintProfilesStatus,
} from "@/hooks/useVoiceprintProfiles"
import { useUserPreferences } from "@/hooks/useUserPreferences"
import { useTranscriptionSettings } from "@/hooks/useTranscriptionSettings"
import { updateTranscriptionSettings } from "@/lib/api"
import type { UserPreferences } from "@/lib/userPreferences"
import {
  voiceprintProfilesListQuery,
  voiceprintProfilesStatusQuery,
} from "@/lib/queries/voiceprints"
import { transcriptionSettingsQuery } from "@/lib/queries/transcriptionSettings"
import { llmSettingsQuery } from "@/lib/queries/llmSettings"
import { userSettingsQuery } from "@/lib/queries/userSettings"

export const Route = createFileRoute("/settings/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(voiceprintProfilesListQuery()),
      context.queryClient.ensureQueryData(voiceprintProfilesStatusQuery()),
      context.queryClient.ensureQueryData(userSettingsQuery()),
      context.queryClient.ensureQueryData(llmSettingsQuery()),
      context.queryClient.ensureQueryData(transcriptionSettingsQuery()),
    ]),
  component: SettingsPage,
})

function SettingsPage() {
  const { t } = useTranslation()
  const { data: profilesData } = useVoiceprintProfiles()
  const { data: voiceprintProfilesStatus } = useVoiceprintProfilesStatus()
  const { settings: transcriptionSettings } = useTranscriptionSettings()
  const toggleMemory = useToggleVoiceprintProfiles()
  const consentMutation = useRecordVoiceprintConsent()
  const { preferences, updatePreferences, ready, isUpdating } = useUserPreferences()
  const [consentOpen, setConsentOpen] = useState(false)
  const [consentPurpose, setConsentPurpose] = useState<VoiceprintConsentPurpose | null>(null)

  const autoLabelReady =
    (transcriptionSettings?.voiceprintProfilesEnabled ?? false) &&
    (transcriptionSettings?.voiceprintProfilesReady ?? false)
  const voiceprintNotReadyReason =
    voiceprintProfilesStatus?.reason ?? transcriptionSettings?.voiceprintProfilesReason ?? null
  const togglePending = toggleMemory.isPending || consentMutation.isPending
  const settingsBusy = !ready || isUpdating
  const profiles = profilesData?.items ?? []

  const savePreference = async (
    patch: Partial<UserPreferences>,
    successMessage?: string,
  ) => {
    try {
      await updatePreferences(patch)
      if (successMessage) {
        toast.success(successMessage)
      }
    } catch {
      toast.error(t("toasts.saveSettingsFailed"))
    }
  }

  const requestConsent = (purpose: VoiceprintConsentPurpose) => {
    setConsentPurpose(purpose)
    setConsentOpen(true)
  }

  const handleConsent = async () => {
    const purpose = consentPurpose
    try {
      await consentMutation.mutateAsync()
      await updateTranscriptionSettings({ voiceprintProfilesEnabled: true })
      if (purpose === "auto-label" || purpose === "enrollment") {
        await toggleMemory.mutateAsync(true)
        toast.success(
          purpose === "auto-label"
            ? t("toasts.autoLabelOn")
            : t("toasts.voiceprintEnrolled"),
        )
      }
      setConsentOpen(false)
      setConsentPurpose(null)
    } catch {
      toast.error(t("toasts.autoLabelEnableFailed"))
    }
  }

  return (
    <PageContainer size="content">
      <BlurFade className="section-stack">
        <UserProfileSettings
          preferences={preferences}
          profiles={profiles}
          ready={ready}
          disabled={settingsBusy}
          voiceprintReady={autoLabelReady}
          voiceprintNotReadyReason={voiceprintNotReadyReason}
          voiceprintConsentGiven={voiceprintProfilesStatus?.consentGiven ?? false}
          onVoiceprintConsentRequired={() => requestConsent("enrollment")}
          onUpdate={savePreference}
        />

        <SettingsSection
          title={t("settings.languageTitle")}
          description={t("settings.languageDescription")}
        >
          <SettingsRow
            label={t("settings.uiLanguageLabel")}
            description={t("settings.uiLanguageDescription")}
          >
            <Select
              value={preferences.uiLanguage}
              onValueChange={(value) => {
                if (value !== "en" && value !== "zh") return
                void savePreference(
                  { uiLanguage: value },
                  value === "zh"
                    ? t("settings.uiLanguageSetZh")
                    : t("settings.uiLanguageSetEn"),
                )
              }}
              disabled={settingsBusy}
            >
              <SelectTrigger className="w-full">
                <span>
                  {preferences.uiLanguage === "zh" ? t("common.chinese") : t("common.english")}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("common.english")}</SelectItem>
                <SelectItem value="zh">{t("common.chinese")}</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow
            label={t("settings.contentLanguageLabel")}
            description={t("settings.contentLanguageDescription")}
          >
            <Select
              value={preferences.contentLanguage}
              onValueChange={(value) => {
                if (value !== "en" && value !== "zh") return
                void savePreference(
                  { contentLanguage: value },
                  value === "zh"
                    ? t("settings.contentLanguageSetZh")
                    : t("settings.contentLanguageSetEn"),
                )
              }}
              disabled={settingsBusy}
            >
              <SelectTrigger className="w-full">
                <span>
                  {preferences.contentLanguage === "zh"
                    ? t("common.chinese")
                    : t("common.english")}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("common.english")}</SelectItem>
                <SelectItem value="zh">{t("common.chinese")}</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
        </SettingsSection>

        <SettingsAiNotesSection
          preferences={preferences}
          disabled={settingsBusy}
          onSave={(patch) => savePreference(patch)}
        />

        <TranscriptionSettingsPanel disabled={settingsBusy} />

        <LlmSettingsPanel disabled={settingsBusy} />

        <SettingsVoiceprintSection
          preferences={preferences}
          disabled={settingsBusy}
          onRequestConsent={requestConsent}
        />

        <VoiceprintConsentDialog
          open={consentOpen}
          onOpenChange={(open) => {
            setConsentOpen(open)
            if (!open) setConsentPurpose(null)
          }}
          onConfirm={() => void handleConsent()}
          isPending={togglePending}
        />
      </BlurFade>
    </PageContainer>
  )
}
