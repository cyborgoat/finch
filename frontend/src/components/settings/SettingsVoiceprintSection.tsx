import { ChevronDown, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsSection"
import { VoiceprintEnrollmentDialog } from "@/components/voiceprints/VoiceprintEnrollmentDialog"
import { VoiceprintProfileManager } from "@/components/voiceprints/VoiceprintProfileManager"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  useDeleteVoiceprintProfile,
  useToggleVoiceprintProfiles,
  useUpdateVoiceprintProfile,
  useVoiceprintProfiles,
  useVoiceprintProfilesStatus,
} from "@/hooks/useVoiceprintProfiles"
import { useTranscriptionSettings } from "@/hooks/useTranscriptionSettings"
import type { UserPreferences } from "@/lib/userPreferences"
import { cn } from "@/lib/utils"

export type VoiceprintConsentPurpose = "auto-label" | "enrollment"

type SettingsVoiceprintSectionProps = {
  preferences: UserPreferences
  disabled?: boolean
  onRequestConsent: (purpose: VoiceprintConsentPurpose) => void
}

export function SettingsVoiceprintSection({
  preferences,
  disabled,
  onRequestConsent,
}: SettingsVoiceprintSectionProps) {
  const { t } = useTranslation()
  const { data: profilesData } = useVoiceprintProfiles()
  const { data: voiceprintProfilesStatus } = useVoiceprintProfilesStatus()
  const { settings: transcriptionSettings } = useTranscriptionSettings()
  const deleteProfile = useDeleteVoiceprintProfile()
  const updateProfile = useUpdateVoiceprintProfile()
  const toggleMemory = useToggleVoiceprintProfiles()
  const [addProfileOpen, setAddProfileOpen] = useState(false)
  const [savedProfilesExpanded, setSavedProfilesExpanded] = useState(false)

  const autoLabelEnabled = voiceprintProfilesStatus?.enabled ?? false
  const autoLabelReady =
    (transcriptionSettings?.voiceprintProfilesEnabled ?? false) &&
    (transcriptionSettings?.voiceprintProfilesReady ?? false)
  const voiceprintNotReadyReason =
    voiceprintProfilesStatus?.reason ?? transcriptionSettings?.voiceprintProfilesReason ?? null
  const togglePending = toggleMemory.isPending
  const profiles = profilesData?.items ?? []

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

    if (!voiceprintProfilesStatus?.consentGiven) {
      onRequestConsent("auto-label")
      return
    }

    try {
      await toggleMemory.mutateAsync(true)
      toast.success(t("toasts.autoLabelOn"))
    } catch {
      toast.error(t("toasts.speakerSettingsFailed"))
    }
  }

  return (
    <>
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
        <div className="border-b border-border last:border-b-0">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            aria-expanded={savedProfilesExpanded}
            aria-label={t("settings.savedVoiceprintsAriaLabel")}
            onClick={() => setSavedProfilesExpanded((expanded) => !expanded)}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t("settings.savedVoiceprintsLabel")}
                {profiles.length > 0 ? (
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    ({profiles.length})
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("settings.savedVoiceprintsDescription")}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                savedProfilesExpanded && "rotate-180",
              )}
            />
          </button>
          {savedProfilesExpanded ? (
            <div className="border-t border-border">
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
              <div className="flex justify-center border-t border-border py-3 pl-8 pr-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || togglePending || !autoLabelReady}
                  onClick={() => setAddProfileOpen(true)}
                >
                  <Plus className="size-4" />
                  {t("settings.addVoiceprintProfile")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </SettingsSection>

      <VoiceprintEnrollmentDialog
        open={addProfileOpen}
        onOpenChange={setAddProfileOpen}
        ready={autoLabelReady}
        notReadyReason={voiceprintNotReadyReason}
        consentGiven={voiceprintProfilesStatus?.consentGiven ?? false}
        disabled={disabled || togglePending}
        uiLanguage={preferences.uiLanguage}
        onConsentRequired={() => onRequestConsent("enrollment")}
      />
    </>
  )
}
