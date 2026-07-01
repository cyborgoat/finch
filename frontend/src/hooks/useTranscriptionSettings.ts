import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { updateTranscriptionSettings } from "@/lib/api"
import { healthQuery } from "@/lib/queries/health"
import { transcriptionSettingsQuery } from "@/lib/queries/transcriptionSettings"
import { speakerMemoryStatusQuery } from "@/lib/queries/speakers"
import type { UpdateTranscriptionSettings } from "@/lib/types"

export function useTranscriptionSettings() {
  const queryClient = useQueryClient()
  const { data, isSuccess, isLoading } = useQuery(transcriptionSettingsQuery())

  const mutation = useMutation({
    mutationFn: (patch: UpdateTranscriptionSettings) =>
      updateTranscriptionSettings(patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(transcriptionSettingsQuery().queryKey, updated)
      void queryClient.invalidateQueries({ queryKey: healthQuery().queryKey })
      void queryClient.invalidateQueries({
        queryKey: speakerMemoryStatusQuery().queryKey,
      })
    },
  })

  return {
    settings: data,
    saveSettings: (patch: UpdateTranscriptionSettings) => mutation.mutateAsync(patch),
    ready: isSuccess,
    isLoading,
    isSaving: mutation.isPending,
  }
}
