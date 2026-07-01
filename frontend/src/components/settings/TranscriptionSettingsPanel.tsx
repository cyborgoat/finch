import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsSection"
import { Switch } from "@/components/ui/switch"
import { useTranscriptionSettings } from "@/hooks/useTranscriptionSettings"
import type { UpdateTranscriptionSettings } from "@/lib/types"

type TranscriptionSettingsPanelProps = {
  disabled?: boolean
}

export function TranscriptionSettingsPanel({
  disabled = false,
}: TranscriptionSettingsPanelProps) {
  const { t } = useTranslation()
  const { settings, saveSettings, ready, isLoading, isSaving } =
    useTranscriptionSettings()

  const persist = async (patch: UpdateTranscriptionSettings) => {
    try {
      await saveSettings(patch)
    } catch {
      toast.error(t("toasts.transcriptionSettingsFailed"))
    }
  }

  if (isLoading || !ready || !settings) {
    return (
      <SettingsSection
        title={t("settings.transcriptionTitle")}
        description={t("settings.transcriptionDescriptionLoading")}
      >
        <div className="px-4 py-3 text-sm text-muted-foreground">{t("common.loading")}</div>
      </SettingsSection>
    )
  }

  const busy = disabled || isSaving

  return (
    <SettingsSection
      title={t("settings.transcriptionTitle")}
      description={t("settings.transcriptionDescription")}
    >
      <SettingsRow
        label={t("settings.diarizationLabel")}
        description={
          settings.diarizationReady || !settings.diarizationEnabled
            ? t("settings.diarizationReadyDescription")
            : (settings.diarizationReason ?? t("settings.diarizationNotReady"))
        }
      >
        <div className="flex justify-end">
          <Switch
            checked={settings.diarizationEnabled}
            onCheckedChange={(checked) => {
              void persist({ diarizationEnabled: checked })
            }}
            disabled={busy}
            aria-label={t("settings.diarizationAriaLabel")}
          />
        </div>
      </SettingsRow>

      <SettingsRow
        label={t("settings.voiceprintProfilesFeatureLabel")}
        description={
          settings.voiceprintProfilesReady || !settings.voiceprintProfilesEnabled
            ? t("settings.voiceprintProfilesFeatureReadyDescription")
            : (settings.voiceprintProfilesReason ?? t("settings.voiceprintProfilesFeatureNotReady"))
        }
      >
        <div className="flex justify-end">
          <Switch
            checked={settings.voiceprintProfilesEnabled}
            onCheckedChange={(checked) => {
              void persist({ voiceprintProfilesEnabled: checked })
            }}
            disabled={busy}
            aria-label={t("settings.voiceprintProfilesFeatureAriaLabel")}
          />
        </div>
      </SettingsRow>
    </SettingsSection>
  )
}
