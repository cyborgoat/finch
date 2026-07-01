import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsSection"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { useLlmSettings } from "@/hooks/useLlmSettings"
import type { LlmProviderId, LlmSettings } from "@/lib/types"

type LlmSettingsPanelProps = {
  disabled?: boolean
}

function providerLabel(settings: LlmSettings, providerId: LlmProviderId): string {
  return (
    settings.providers.find((provider) => provider.id === providerId)?.displayName ??
    providerId
  )
}

function baseUrlDescription(t: TFunction, provider: LlmProviderId): string {
  switch (provider) {
    case "custom":
      return t("settings.llmBaseUrlCustom")
    case "openai":
      return t("settings.llmBaseUrlOpenai")
    case "openrouter":
      return t("settings.llmBaseUrlOpenrouter")
    case "anthropic":
      return t("settings.llmBaseUrlAnthropic")
  }
}

export function LlmSettingsPanel({ disabled = false }: LlmSettingsPanelProps) {
  const { t } = useTranslation()
  const { settings, saveSettings, ready, isLoading, isSaving } = useLlmSettings()
  const [provider, setProvider] = useState<LlmProviderId>("openrouter")
  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [defaultModel, setDefaultModel] = useState("")
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!settings) return
    setProvider(settings.provider)
    setApiKey("")
    setBaseUrl(settings.baseUrl)
    setDefaultModel(settings.defaultModel)
    setDirty(false)
  }, [settings])

  if (isLoading || !ready || !settings) {
    return (
      <SettingsSection
        title={t("settings.llmTitle")}
        description={t("settings.llmDescriptionLoading")}
      >
        <div className="px-4 py-3 text-sm text-muted-foreground">{t("common.loading")}</div>
      </SettingsSection>
    )
  }

  const selectedProvider =
    settings.providers.find((item) => item.id === provider) ??
    settings.providers[0]

  const handleProviderChange = (value: string) => {
    if (
      value !== "openrouter" &&
      value !== "openai" &&
      value !== "anthropic" &&
      value !== "custom"
    ) {
      return
    }
    setProvider(value)
    const preset = settings.providers.find((item) => item.id === value)
    if (preset) {
      setBaseUrl(preset.defaultBaseUrl)
      setDefaultModel(preset.defaultModel)
    }
    setDirty(true)
  }

  const handleSave = async () => {
    try {
      const patch: {
        provider: LlmProviderId
        apiKey?: string
        baseUrl: string
        defaultModel: string
      } = {
        provider,
        baseUrl: baseUrl.trim(),
        defaultModel: defaultModel.trim(),
      }
      if (apiKey.trim()) {
        patch.apiKey = apiKey.trim()
      }
      await saveSettings(patch)
      setApiKey("")
      setDirty(false)
      toast.success(t("toasts.llmSettingsSaved"))
    } catch {
      toast.error(t("toasts.failedToSaveLlmSettings"))
    }
  }

  const busy = disabled || isSaving
  const isCustomProvider = provider === "custom"

  return (
    <SettingsSection
      title={t("settings.llmTitle")}
      description={t("settings.llmDescription")}
    >
      <SettingsRow
        label={t("settings.llmStatusLabel")}
        description={
          settings.configured
            ? t("settings.llmStatusReady", { provider: settings.providerDisplayName })
            : t("settings.llmStatusNotReady")
        }
      >
        <div className="flex flex-wrap justify-end gap-2">
          {settings.configured ? (
            <Badge>{t("settings.llmStatusConfigured")}</Badge>
          ) : (
            <Badge variant="destructive">{t("settings.llmStatusNotConfigured")}</Badge>
          )}
          {settings.source === "stored" ? (
            <Badge variant="outline">{t("settings.llmStatusSavedLocally")}</Badge>
          ) : null}
        </div>
      </SettingsRow>

      <SettingsRow label={t("settings.llmProviderLabel")}>
        <Select value={provider} onValueChange={handleProviderChange} disabled={busy}>
          <SelectTrigger className="w-full">
            <span>{providerLabel(settings, provider)}</span>
          </SelectTrigger>
          <SelectContent>
            {settings.providers.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsRow>

      <SettingsRow
        label={t("settings.llmApiKeyLabel")}
        description={
          settings.apiKeyConfigured
            ? t("settings.llmApiKeySavedHint")
            : provider === "custom"
              ? t("settings.llmApiKeyOptionalLocal")
              : t("settings.llmApiKeyRequiredCloud")
        }
      >
        <Input
          type="password"
          autoComplete="off"
          placeholder={
            settings.apiKeyConfigured
              ? t("settings.llmApiKeyPlaceholderSaved")
              : t("settings.llmApiKeyPlaceholderNew")
          }
          value={apiKey}
          onChange={(event) => {
            setApiKey(event.target.value)
            setDirty(true)
          }}
          disabled={busy}
        />
      </SettingsRow>

      <SettingsRow
        label={t("settings.llmBaseUrlLabel")}
        description={baseUrlDescription(t, provider)}
      >
        <Input
          value={baseUrl}
          onChange={(event) => {
            setBaseUrl(event.target.value)
            setDirty(true)
          }}
          placeholder={selectedProvider?.defaultBaseUrl || t("settings.llmBaseUrlPlaceholder")}
          disabled={busy}
        />
      </SettingsRow>

      <SettingsRow
        label={t("settings.llmDefaultModelLabel")}
        description={
          isCustomProvider
            ? t("settings.llmDefaultModelCustomHint")
            : t("settings.llmDefaultModelPresetHint", {
                model: selectedProvider?.defaultModel ?? "",
              })
        }
      >
        <Input
          value={defaultModel}
          onChange={(event) => {
            setDefaultModel(event.target.value)
            setDirty(true)
          }}
          placeholder={selectedProvider?.defaultModel || t("settings.llmDefaultModelPlaceholder")}
          disabled={busy}
        />
      </SettingsRow>

      <div className="flex justify-end border-t border-border px-4 py-3">
        <Button type="button" onClick={() => void handleSave()} disabled={busy || !dirty}>
          {isSaving ? t("common.saving") : t("settings.llmSaveButton")}
        </Button>
      </div>
    </SettingsSection>
  )
}
