
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  deleteVoiceprintProfile,
  enrollVoiceprintProfileSample,
  recordVoiceprintProfilesConsent,
  toggleVoiceprintProfiles,
  updateVoiceprintProfile,
} from "@/lib/api"
import {
  voiceprintProfilesListQuery,
  voiceprintProfilesStatusQuery,
} from "@/lib/queries/voiceprints"
import { healthQuery } from "@/lib/queries/health"
import { transcriptionSettingsQuery } from "@/lib/queries/transcriptionSettings"
import { userSettingsQuery } from "@/lib/queries/userSettings"

export function useVoiceprintProfiles() {
  return useQuery(voiceprintProfilesListQuery())
}

export function useVoiceprintProfilesStatus() {
  return useQuery(voiceprintProfilesStatusQuery())
}

export function useRecordVoiceprintConsent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: recordVoiceprintProfilesConsent,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: voiceprintProfilesStatusQuery().queryKey })
      void queryClient.invalidateQueries({
        queryKey: transcriptionSettingsQuery().queryKey,
      })
      void queryClient.invalidateQueries({ queryKey: healthQuery().queryKey })
    },
  })
}

export function useToggleVoiceprintProfiles() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: toggleVoiceprintProfiles,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: voiceprintProfilesStatusQuery().queryKey })
      void queryClient.invalidateQueries({
        queryKey: transcriptionSettingsQuery().queryKey,
      })
      void queryClient.invalidateQueries({ queryKey: healthQuery().queryKey })
    },
  })
}

export function useUpdateVoiceprintProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      voiceprintProfileId,
      displayName,
    }: {
      voiceprintProfileId: string
      displayName: string
    }) => updateVoiceprintProfile(voiceprintProfileId, { displayName }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: voiceprintProfilesListQuery().queryKey })
    },
  })
}

export function useDeleteVoiceprintProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteVoiceprintProfile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: voiceprintProfilesListQuery().queryKey })
      void queryClient.invalidateQueries({ queryKey: voiceprintProfilesStatusQuery().queryKey })
      void queryClient.invalidateQueries({ queryKey: userSettingsQuery().queryKey })
    },
  })
}

export function useEnrollVoiceprintProfileSample() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: enrollVoiceprintProfileSample,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: voiceprintProfilesListQuery().queryKey })
      void queryClient.invalidateQueries({ queryKey: voiceprintProfilesStatusQuery().queryKey })
      void queryClient.invalidateQueries({ queryKey: userSettingsQuery().queryKey })
      void queryClient.invalidateQueries({ queryKey: healthQuery().queryKey })
    },
  })
}
