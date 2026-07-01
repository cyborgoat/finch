import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsSection"
import { UserProfileSettings } from "@/components/settings/UserProfileSettings"
import { LlmSettingsPanel } from "@/components/settings/LlmSettingsPanel"
import { TranscriptionSettingsPanel } from "@/components/settings/TranscriptionSettingsPanel"
import { VoiceprintConsentDialog } from "@/components/voiceprints/VoiceprintConsentDialog"
import { VoiceprintEnrollmentDialog } from "@/components/voiceprints/VoiceprintEnrollmentDialog"
import { VoiceprintProfileManager } from "@/components/voiceprints/VoiceprintProfileManager"
import { PageContainer } from "@/components/layout/PageContainer"
import { BlurFade } from "@/components/motion-primitives/blur-fade"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  useDeleteVoiceprintProfile,
  useRecordVoiceprintConsent,
  useVoiceprintProfilesStatus,
  useVoiceprintProfiles,
  useToggleVoiceprintProfiles,
  useUpdateVoiceprintProfile,
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

type ConsentPurpose = "auto-label" | "enrollment" | null

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
  const { data: memoryStatus } = useVoiceprintProfilesStatus()
  const { settings: transcriptionSettings } = useTranscriptionSettings()
  const deleteProfile = useDeleteVoiceprintProfile()
  const updateProfile = useUpdateVoiceprintProfile()
  const toggleMemory = useToggleVoiceprintProfiles()
  const consentMutation = useRecordVoiceprintConsent()
  const { preferences, updatePreferences, ready, isUpdating } = useUserPreferences()
  const [consentOpen, setConsentOpen] = useState(false)
  const [consentPurpose, setConsentPurpose] = useState<ConsentPurpose>(null)
  const [addProfileOpen, setAddProfileOpen] = useState(false)

  const autoLabelEnabled = memoryStatus?.enabled ?? false
  const autoLabelReady =
    (transcriptionSettings?.speakerMemoryEnabled ?? false) &&
    (transcriptionSettings?.speakerMemoryReady ?? false)
  const voiceprintNotReadyReason =
    memoryStatus?.reason ?? transcriptionSettings?.speakerMemoryReason ?? null
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

  const requestConsent = (purpose: ConsentPurpose) => {
    setConsentPurpose(purpose)
    setConsentOpen(true)
  }

  const handleAutoLabelChange = async (enabled: boolean) => {
    if (!enabled) {
      try {
        await toggleMemory.mutateAsync(false)
        toast.success(t("toasts.autoLabelOff"))
      } catch {
        toast.error(t("toasts.speakerSettingsFailed"))
      }
      return
    }

    if (!memoryStatus?.consentGiven) {
      requestConsent("auto-label")
      return
    }

    try {
      await toggleMemory.mutateAsync(true)
      toast.success(t("toasts.autoLabelOn"))
    } catch {
      toast.error(t("toasts.speakerSettingsFailed"))
    }
  }

  const handleConsent = async () => {
    const purpose = consentPurpose
    try {
      await consentMutation.mutateAsync()
      await updateTranscriptionSettings({ speakerMemoryEnabled: true })
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
          voiceprintConsentGiven={memoryStatus?.consentGiven ?? false}
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

        <SettingsSection
          title={t("settings.aiNotesTitle")}
          description={t("settings.aiNotesDescription")}
        >
          <SettingsRow
            label={t("settings.summaryStyleLabel")}
            description={t("settings.summaryStyleDescription")}
          >
            <Select
              value={preferences.summaryStyle}
              onValueChange={(value) => {
                if (value !== "concise" && value !== "balanced" && value !== "detailed") {
                  return
                }
                void savePreference({ summaryStyle: value })
              }}
              disabled={settingsBusy}
            >
              <SelectTrigger className="w-full">
                <span>
                  {preferences.summaryStyle === "concise"
                    ? t("settings.summaryStyleConcise")
                    : preferences.summaryStyle === "detailed"
                      ? t("settings.summaryStyleDetailed")
                      : t("settings.summaryStyleBalanced")}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concise">{t("settings.summaryStyleConcise")}</SelectItem>
                <SelectItem value="balanced">{t("settings.summaryStyleBalanced")}</SelectItem>
                <SelectItem value="detailed">{t("settings.summaryStyleDetailed")}</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow
            label={t("settings.summaryFormatLabel")}
            description={t("settings.summaryFormatDescription")}
          >
            <Select
              value={preferences.summaryFormat}
              onValueChange={(value) => {
                if (value !== "paragraphs" && value !== "bullets") return
                void savePreference({ summaryFormat: value })
              }}
              disabled={settingsBusy}
            >
              <SelectTrigger className="w-full">
                <span>
                  {preferences.summaryFormat === "bullets"
                    ? t("settings.summaryFormatBullets")
                    : t("settings.summaryFormatParagraphs")}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paragraphs">{t("settings.summaryFormatParagraphs")}</SelectItem>
                <SelectItem value="bullets">{t("settings.summaryFormatBullets")}</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow
            label={t("settings.notesAutoSaveLabel")}
            description={t("settings.notesAutoSaveDescription")}
          >
            <div className="flex justify-end">
              <Switch
                checked={preferences.notesAutoSave}
                onCheckedChange={(checked) => {
                  void savePreference({ notesAutoSave: checked })
                }}
                disabled={settingsBusy}
              />
            </div>
          </SettingsRow>
        </SettingsSection>

        <TranscriptionSettingsPanel disabled={settingsBusy} />

        <LlmSettingsPanel disabled={settingsBusy} />

        <SettingsSection
          title={t("settings.speakersTitle")}
          description={t("settings.speakersDescription")}
        >
          <SettingsRow
            label={t("settings.autoLabelLabel")}
            description={
              autoLabelReady
                ? t("settings.autoLabelReadyDescription")
                : (voiceprintNotReadyReason ?? t("settings.autoLabelNotReady"))
            }
          >
            <div className="flex justify-end">
              <Switch
                checked={autoLabelEnabled}
                onCheckedChange={(checked) => void handleAutoLabelChange(checked)}
                disabled={!autoLabelReady || togglePending}
                aria-label={t("settings.autoLabelAriaLabel")}
              />
            </div>
          </SettingsRow>
          <SettingsRow
            label={t("settings.savedVoiceprintsLabel")}
            description={t("settings.savedVoiceprintsDescription")}
          >
            <div className="flex w-full justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={settingsBusy || togglePending || !autoLabelReady}
                onClick={() => setAddProfileOpen(true)}
              >
                {t("settings.addVoiceprintProfile")}
              </Button>
            </div>
          </SettingsRow>
          <VoiceprintProfileManager
            embedded
            profiles={profiles}
            userVoiceprintProfileId={preferences.userVoiceprintProfileId}
            isDeleting={deleteProfile.isPending}
            isRenaming={updateProfile.isPending}
            onRename={(voiceprintProfileId, displayName) => {
              void updateProfile.mutateAsync({ voiceprintProfileId, displayName }).then(() => {
                toast.success(t("toasts.speakerRenamed", { name: displayName }))
              })
            }}
            onDelete={(voiceprintProfileId, displayName) => {
              void deleteProfile.mutateAsync(voiceprintProfileId).then(() => {
                toast.success(t("toasts.speakerRemoved", { name: displayName }))
              })
            }}
          />
        </SettingsSection>

        <VoiceprintConsentDialog
          open={consentOpen}
          onOpenChange={(open) => {
            setConsentOpen(open)
            if (!open) setConsentPurpose(null)
          }}
          onConfirm={() => void handleConsent()}
          isPending={togglePending}
        />

        <VoiceprintEnrollmentDialog
          open={addProfileOpen}
          onOpenChange={setAddProfileOpen}
          ready={autoLabelReady}
          notReadyReason={voiceprintNotReadyReason}
          consentGiven={memoryStatus?.consentGiven ?? false}
          disabled={settingsBusy || togglePending}
          defaultDisplayName={preferences.userName}
          uiLanguage={preferences.uiLanguage}
          onConsentRequired={() => requestConsent("enrollment")}
        />
      </BlurFade>
    </PageContainer>
  )
}
