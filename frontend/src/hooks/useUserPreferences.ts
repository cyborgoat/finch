import { createSettingsMutationHook } from "@/hooks/createSettingsHook"
import { updateUserSettings } from "@/lib/api"
import { userSettingsQuery } from "@/lib/queries/userSettings"
import {
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
} from "@/lib/userPreferences"

const useUserSettingsMutation = createSettingsMutationHook<
  UserPreferences,
  Partial<UserPreferences>
>({
  getQueryOptions: userSettingsQuery,
  mutationFn: updateUserSettings,
  invalidateKeys: [],
})

export function useUserPreferences() {
  const { settings, saveSettings, ready, isLoading, isSaving } =
    useUserSettingsMutation()

  return {
    preferences: settings ?? DEFAULT_USER_PREFERENCES,
    updatePreferences: saveSettings,
    ready,
    isLoading,
    isUpdating: isSaving,
  }
}
