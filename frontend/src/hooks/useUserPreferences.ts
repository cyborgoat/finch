import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { updateUserSettings } from "@/lib/api"
import { userSettingsQuery } from "@/lib/queries/userSettings"
import {
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
} from "@/lib/userPreferences"

export function useUserPreferences() {
  const queryClient = useQueryClient()
  const { data, isSuccess, isLoading } = useQuery(userSettingsQuery())

  const mutation = useMutation({
    mutationFn: (patch: Partial<UserPreferences>) => updateUserSettings(patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(userSettingsQuery().queryKey, updated)
    },
  })

  const updatePreferences = (patch: Partial<UserPreferences>) =>
    mutation.mutateAsync(patch)

  return {
    preferences: data ?? DEFAULT_USER_PREFERENCES,
    updatePreferences,
    ready: isSuccess,
    isLoading,
    isUpdating: mutation.isPending,
  }
}
