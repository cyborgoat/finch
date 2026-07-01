import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { updateLlmSettings } from "@/lib/api"
import { healthQuery } from "@/lib/queries/health"
import { llmSettingsQuery } from "@/lib/queries/llmSettings"
import type { UpdateLlmSettings } from "@/lib/types"

export function useLlmSettings() {
  const queryClient = useQueryClient()
  const { data, isSuccess, isLoading } = useQuery(llmSettingsQuery())

  const mutation = useMutation({
    mutationFn: (patch: UpdateLlmSettings) => updateLlmSettings(patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(llmSettingsQuery().queryKey, updated)
      void queryClient.invalidateQueries({ queryKey: healthQuery().queryKey })
    },
  })

  const saveSettings = (patch: UpdateLlmSettings) => mutation.mutateAsync(patch)

  return {
    settings: data,
    saveSettings,
    ready: isSuccess,
    isLoading,
    isSaving: mutation.isPending,
  }
}
