
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  deleteVoiceprintProfilesData,
  deleteVoiceprintProfile,
  enrollVoiceprintProfileSample,
  getVoiceprintProfilesStatus,
  listVoiceprintProfiles,
  recordVoiceprintProfilesConsent,
  toggleVoiceprintProfiles,
  updateVoiceprintProfile,
} from "@/lib/api"

export function useVoiceprintProfiles() {
  return useQuery({
    queryKey: ["voiceprint-profiles"],
    queryFn: listVoiceprintProfiles,
  })
}

export function useVoiceprintProfilesStatus() {
  return useQuery({
    queryKey: ["voiceprint-profiles-status"],
    queryFn: getVoiceprintProfilesStatus,
  })
}

export function useRecordVoiceprintConsent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: recordVoiceprintProfilesConsent,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["voiceprint-profiles-status"] })
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
      void queryClient.invalidateQueries({ queryKey: ["voiceprint-profiles-status"] })
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
      void queryClient.invalidateQueries({ queryKey: ["voiceprint-profiles"] })
    },
  })
}

export function useDeleteVoiceprintProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteVoiceprintProfile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["voiceprint-profiles"] })
      void queryClient.invalidateQueries({ queryKey: ["voiceprint-profiles-status"] })
      void queryClient.invalidateQueries({ queryKey: ["user-settings"] })
    },
  })
}

export function useEnrollVoiceprintProfileSample() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: enrollVoiceprintProfileSample,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["voiceprint-profiles"] })
      void queryClient.invalidateQueries({ queryKey: ["voiceprint-profiles-status"] })
      void queryClient.invalidateQueries({ queryKey: ["user-settings"] })
      void queryClient.invalidateQueries({ queryKey: ["health"] })
    },
  })
}

export function useDeleteVoiceprintProfilesData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteVoiceprintProfilesData,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["voiceprint-profiles"] })
      void queryClient.invalidateQueries({ queryKey: ["voiceprint-profiles-status"] })
      void queryClient.invalidateQueries({ queryKey: ["health"] })
    },
  })
}
