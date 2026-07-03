
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
      void queryClient.invalidateQueries({ queryKey: ["transcription-settings"] })
      void queryClient.invalidateQueries({ queryKey: ["health"] })
    },
  })
}

export function useToggleVoiceprintProfiles() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: toggleVoiceprintProfiles,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: voiceprintProfilesStatusQuery().queryKey })
      void queryClient.invalidateQueries({ queryKey: ["transcription-settings"] })
      void queryClient.invalidateQueries({ queryKey: ["health"] })
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
      void queryClient.invalidateQueries({ queryKey: ["user-settings"] })
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
      void queryClient.invalidateQueries({ queryKey: ["user-settings"] })
      void queryClient.invalidateQueries({ queryKey: ["health"] })
    },
  })
}
