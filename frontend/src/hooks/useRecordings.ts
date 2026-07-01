
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  deleteRecording,
  getRecording,
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

export function useUpdateRecording(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: Partial<Pick<Recording, "title" | "editedText" | "status">>,
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
