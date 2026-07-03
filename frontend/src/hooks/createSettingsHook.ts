import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query"

type SettingsQueryOptions<TSettings> = {
  queryKey: QueryKey
  queryFn: () => Promise<TSettings>
}

export function createSettingsMutationHook<TSettings, TPatch>({
  getQueryOptions,
  mutationFn,
  invalidateKeys,
}: {
  getQueryOptions: () => SettingsQueryOptions<TSettings>
  mutationFn: (patch: TPatch) => Promise<TSettings>
  invalidateKeys: QueryKey[]
}) {
  return function useSettingsHook() {
    const queryClient = useQueryClient()
    const queryOptions = getQueryOptions()
    const { data, isSuccess, isLoading } = useQuery(queryOptions)

    const mutation = useMutation({
      mutationFn,
      onSuccess: (updated) => {
        queryClient.setQueryData(queryOptions.queryKey, updated)
        for (const key of invalidateKeys) {
          void queryClient.invalidateQueries({ queryKey: key })
        }
      },
    })

    return {
      settings: data,
      saveSettings: (patch: TPatch) => mutation.mutateAsync(patch),
      ready: isSuccess,
      isLoading,
      isSaving: mutation.isPending,
    }
  }
}
