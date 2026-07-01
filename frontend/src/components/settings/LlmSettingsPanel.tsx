import { useEffect, useState } from "react"
import { toast } from "sonner"
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

function baseUrlDescription(provider: LlmProviderId): string {
  switch (provider) {
    case "custom":
      return "OpenAI-compatible endpoint, e.g. http://localhost:11434/v1 for Ollama."
    case "openai":
      return "Optional. Override for Azure OpenAI, proxies, or other compatible endpoints."
    case "openrouter":
      return "Optional. Override the OpenRouter API base URL."
    case "anthropic":
      return "Optional. Override the Anthropic API base URL."
  }
}

export function LlmSettingsPanel({ disabled = false }: LlmSettingsPanelProps) {
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
        title="LLM provider"
        description="Configure the model provider used for AI actions."
      >
        <div className="px-4 py-3 text-sm text-muted-foreground">Loading…</div>
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
      toast.success("LLM settings saved")
    } catch {
      toast.error("Failed to save LLM settings")
    }
  }

  const busy = disabled || isSaving
  const isCustomProvider = provider === "custom"

  return (
    <SettingsSection
      title="LLM provider"
      description="Configure the model provider used for transcript summaries. Only transcript text is sent—not audio. Credentials are stored locally in the Finch database and are never returned by the API."
    >
      <SettingsRow
        label="Status"
        description={
          settings.configured
            ? `Ready via ${settings.providerDisplayName}.`
            : "Add an API key and save to enable summaries."
        }
      >
        <div className="flex flex-wrap justify-end gap-2">
          {settings.configured ? (
            <Badge>Configured</Badge>
          ) : (
            <Badge variant="destructive">Not configured</Badge>
          )}
          {settings.source === "stored" ? (
            <Badge variant="outline">Saved locally</Badge>
          ) : null}
        </div>
      </SettingsRow>

      <SettingsRow label="Provider">
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
        label="API key"
        description={
          settings.apiKeyConfigured
            ? "A key is saved. Enter a new value to replace it."
            : provider === "custom"
              ? "Optional for local servers without authentication."
              : "Required for cloud providers."
        }
      >
        <Input
          type="password"
          autoComplete="off"
          placeholder={settings.apiKeyConfigured ? "••••••••" : "sk-..."}
          value={apiKey}
          onChange={(event) => {
            setApiKey(event.target.value)
            setDirty(true)
          }}
          disabled={busy}
        />
      </SettingsRow>

      <SettingsRow
        label="Base URL"
        description={baseUrlDescription(provider)}
      >
        <Input
          value={baseUrl}
          onChange={(event) => {
            setBaseUrl(event.target.value)
            setDirty(true)
          }}
          placeholder={selectedProvider?.defaultBaseUrl || "https://api.example.com/v1"}
          disabled={busy}
        />
      </SettingsRow>

      <SettingsRow
        label="Default model"
        description={
          isCustomProvider
            ? "Model name your server expects."
            : `Preset default: ${selectedProvider?.defaultModel ?? ""}`
        }
      >
        <Input
          value={defaultModel}
          onChange={(event) => {
            setDefaultModel(event.target.value)
            setDirty(true)
          }}
          placeholder={selectedProvider?.defaultModel || "model-id"}
          disabled={busy}
        />
      </SettingsRow>

      <div className="flex justify-end border-t border-border px-4 py-3">
        <Button type="button" onClick={() => void handleSave()} disabled={busy || !dirty}>
          {isSaving ? "Saving…" : "Save LLM settings"}
        </Button>
      </div>
    </SettingsSection>
  )
}
