import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsSection"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useTranscriptionSettings } from "@/hooks/useTranscriptionSettings"

type TranscriptionSettingsPanelProps = {
  disabled?: boolean
}

export function TranscriptionSettingsPanel({
  disabled = false,
}: TranscriptionSettingsPanelProps) {
  const { t } = useTranslation()
  const { settings, saveSettings, ready, isLoading, isSaving } =
    useTranscriptionSettings()
  const [diarizationEnabled, setDiarizationEnabled] = useState(false)
  const [speakerMemoryEnabled, setSpeakerMemoryEnabled] = useState(false)
  const [hfToken, setHfToken] = useState("")
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!settings) return
    setDiarizationEnabled(settings.diarizationEnabled)
    setSpeakerMemoryEnabled(settings.speakerMemoryEnabled)
    setHfToken("")
    setDirty(false)
  }, [settings])

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

  const handleSave = async () => {
    try {
      await saveSettings({
        diarizationEnabled,
        speakerMemoryEnabled,
        ...(hfToken.trim() ? { hfToken: hfToken.trim() } : {}),
      })
      toast.success(t("toasts.transcriptionSettingsSaved"))
      setHfToken("")
      setDirty(false)
    } catch {
      toast.error(t("toasts.transcriptionSettingsFailed"))
    }
  }

  const markDirty = () => setDirty(true)

  return (
    <SettingsSection
      title={t("settings.transcriptionTitle")}
      description={t("settings.transcriptionDescription")}
    >
      <SettingsRow
        label={t("settings.diarizationLabel")}
        description={
          settings.diarizationReady || !diarizationEnabled
            ? t("settings.diarizationReadyDescription")
            : (settings.diarizationReason ?? t("settings.diarizationNotReady"))
        }
      >
        <div className="flex items-center justify-end gap-2">
          {diarizationEnabled ? (
            settings.diarizationReady ? (
              <Badge>{t("settings.statusReady")}</Badge>
            ) : (
              <Badge variant="destructive">{t("settings.statusNotReady")}</Badge>
            )
          ) : null}
          <Switch
            checked={diarizationEnabled}
            onCheckedChange={(checked) => {
              setDiarizationEnabled(checked)
              markDirty()
            }}
            disabled={disabled || isSaving}
            aria-label={t("settings.diarizationAriaLabel")}
          />
        </div>
      </SettingsRow>

      <SettingsRow
        label={t("settings.hfTokenLabel")}
        description={t("settings.hfTokenDescription")}
      >
        <Input
          type="password"
          value={hfToken}
          onChange={(event) => {
            setHfToken(event.target.value)
            markDirty()
          }}
          placeholder={
            settings.hfTokenConfigured
              ? t("settings.hfTokenPlaceholderSaved")
              : t("settings.hfTokenPlaceholderNew")
          }
          disabled={disabled || isSaving}
          autoComplete="off"
        />
      </SettingsRow>

      <SettingsRow
        label={t("settings.speakerMemoryFeatureLabel")}
        description={
          settings.speakerMemoryReady || !speakerMemoryEnabled
            ? t("settings.speakerMemoryFeatureReadyDescription")
            : (settings.speakerMemoryReason ?? t("settings.speakerMemoryFeatureNotReady"))
        }
      >
        <div className="flex items-center justify-end gap-2">
          {speakerMemoryEnabled ? (
            settings.speakerMemoryReady ? (
              <Badge>{t("settings.statusReady")}</Badge>
            ) : (
              <Badge variant="destructive">{t("settings.statusNotReady")}</Badge>
            )
          ) : null}
          <Switch
            checked={speakerMemoryEnabled}
            onCheckedChange={(checked) => {
              setSpeakerMemoryEnabled(checked)
              markDirty()
            }}
            disabled={disabled || isSaving}
            aria-label={t("settings.speakerMemoryFeatureAriaLabel")}
          />
        </div>
      </SettingsRow>

      <div className="border-t border-border px-4 py-3">
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={disabled || isSaving || !dirty}
        >
          {isSaving ? t("common.saving") : t("settings.transcriptionSaveButton")}
        </Button>
      </div>
    </SettingsSection>
  )
}
