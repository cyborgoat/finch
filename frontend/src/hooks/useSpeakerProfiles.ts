
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  deleteSpeakerMemoryData,
  deleteSpeakerProfile,
  getSpeakerMemoryStatus,
  listSpeakerProfiles,
  recordSpeakerMemoryConsent,
  toggleSpeakerMemory,
  updateSpeakerProfile,
} from "@/lib/api"

export function useSpeakerProfiles() {
  return useQuery({
    queryKey: ["speaker-profiles"],
    queryFn: listSpeakerProfiles,
  })
}

export function useSpeakerMemoryStatus() {
  return useQuery({
    queryKey: ["speaker-memory-status"],
    queryFn: getSpeakerMemoryStatus,
  })
}

export function useRecordSpeakerConsent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: recordSpeakerMemoryConsent,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["speaker-memory-status"] })
      void queryClient.invalidateQueries({ queryKey: ["transcription-settings"] })
      void queryClient.invalidateQueries({ queryKey: ["health"] })
    },
  })
}

export function useToggleSpeakerMemory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: toggleSpeakerMemory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["speaker-memory-status"] })
      void queryClient.invalidateQueries({ queryKey: ["transcription-settings"] })
      void queryClient.invalidateQueries({ queryKey: ["health"] })
    },
  })
}

export function useUpdateSpeakerProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      profileId,
      displayName,
    }: {
      profileId: string
      displayName: string
    }) => updateSpeakerProfile(profileId, { displayName }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["speaker-profiles"] })
    },
  })
}

export function useDeleteSpeakerProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSpeakerProfile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["speaker-profiles"] })
      void queryClient.invalidateQueries({ queryKey: ["speaker-memory-status"] })
      void queryClient.invalidateQueries({ queryKey: ["user-settings"] })
    },
  })
}

export function useDeleteSpeakerMemoryData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSpeakerMemoryData,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["speaker-profiles"] })
      void queryClient.invalidateQueries({ queryKey: ["speaker-memory-status"] })
      void queryClient.invalidateQueries({ queryKey: ["health"] })
    },
  })
}
