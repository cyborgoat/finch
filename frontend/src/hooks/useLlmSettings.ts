import { createSettingsMutationHook } from "@/hooks/createSettingsHook"
import { updateLlmSettings } from "@/lib/api"
import { healthQuery } from "@/lib/queries/health"
import { llmSettingsQuery } from "@/lib/queries/llmSettings"

export const useLlmSettings = createSettingsMutationHook({
  getQueryOptions: llmSettingsQuery,
  mutationFn: updateLlmSettings,
  invalidateKeys: [healthQuery().queryKey],
})
