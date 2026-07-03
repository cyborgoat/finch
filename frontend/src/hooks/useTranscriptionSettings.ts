import { createSettingsMutationHook } from "@/hooks/createSettingsHook"
import { updateTranscriptionSettings } from "@/lib/api"
import { healthQuery } from "@/lib/queries/health"
import { transcriptionSettingsQuery } from "@/lib/queries/transcriptionSettings"
import { voiceprintProfilesStatusQuery } from "@/lib/queries/voiceprints"

export const useTranscriptionSettings = createSettingsMutationHook({
  getQueryOptions: transcriptionSettingsQuery,
  mutationFn: updateTranscriptionSettings,
  invalidateKeys: [healthQuery().queryKey, voiceprintProfilesStatusQuery().queryKey],
})
