
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createRecording,
  deleteRecording,
  getRecording,
  startTranscription,
  updateRecording,
} from "@/lib/api"
import type { Recording } from "@/lib/types"

export function useRecording(id: string) {
  return useQuery({
    queryKey: ["recordings", id],
    queryFn: () => getRecording(id),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === "transcribing" ? 2000 : false,
  })
}

export function useCreateRecording() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRecording,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recordings"] })
    },
  })
}

export function useStartTranscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      recordingId,
      language,
      regenerate,
    }: {
      recordingId: string
      language?: string
      regenerate?: boolean
    }) => startTranscription(recordingId, { language, regenerate }),
    onSuccess: (_data, { recordingId }) => {
      void queryClient.invalidateQueries({ queryKey: ["recordings"] })
      void queryClient.invalidateQueries({ queryKey: ["recordings", recordingId] })
    },
  })
}

export function useUpdateRecording(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: Partial<Pick<Recording, "title" | "editedText">>,
    ) => updateRecording(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recordings"] })
      void queryClient.invalidateQueries({ queryKey: ["recordings", id] })
    },
  })
}

export function useRenameRecording() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateRecording(id, { title }),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["recordings"] })
      void queryClient.invalidateQueries({ queryKey: ["recordings", id] })
    },
  })
}

export function useDeleteRecording() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteRecording,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recordings"] })
      void queryClient.invalidateQueries({ queryKey: ["notes"] })
    },
  })
}

export function useInvalidateRecordings() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["recordings"] })
  }
}
