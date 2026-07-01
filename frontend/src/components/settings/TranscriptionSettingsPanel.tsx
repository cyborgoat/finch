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
        label={t("settings.speakerMemoryFeatureLabel")}
        description={
          settings.speakerMemoryReady || !settings.speakerMemoryEnabled
            ? t("settings.speakerMemoryFeatureReadyDescription")
            : (settings.speakerMemoryReason ?? t("settings.speakerMemoryFeatureNotReady"))
        }
      >
        <div className="flex justify-end">
          <Switch
            checked={settings.speakerMemoryEnabled}
            onCheckedChange={(checked) => {
              void persist({ speakerMemoryEnabled: checked })
            }}
            disabled={busy}
            aria-label={t("settings.speakerMemoryFeatureAriaLabel")}
          />
        </div>
      </SettingsRow>
    </SettingsSection>
  )
}
