
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import {
  createRecording,
  deleteRecording,
  startTranscription,
  updateRecording,
} from "@/lib/api"
import { recordingQuery } from "@/lib/queries/recordings"
import { recordingsListQuery } from "@/lib/queries/recordingsList"
import { recentRecordings, type RecordingListItem } from "@/lib/recordings"
import type { Recording } from "@/lib/types"

function invalidateRecordingQueries(queryClient: QueryClient, id?: string) {
  void queryClient.invalidateQueries({ queryKey: ["recordings"] })
  if (id) {
    void queryClient.invalidateQueries({ queryKey: ["recordings", id] })
  }
}

function hasTranscribing(items: RecordingListItem[]) {
  return items.some((item) => item.status === "transcribing")
}

export function useRecording(id: string) {
  return useQuery({
    ...recordingQuery(id),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === "transcribing" ? 2000 : false,
  })
}

export function useRecordingsList() {
  return useQuery({
    ...recordingsListQuery(),
    refetchInterval: (query) =>
      hasTranscribing(query.state.data?.items ?? []) ? 2000 : false,
  })
}

export function useRecentRecordings(limit = 8) {
  const { data, ...rest } = useRecordingsList()
  return {
    ...rest,
    data: data ? recentRecordings(data.items, limit) : undefined,
  }
}

export function useCreateRecording() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRecording,
    onSuccess: () => {
      invalidateRecordingQueries(queryClient)
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
      invalidateRecordingQueries(queryClient, recordingId)
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
      invalidateRecordingQueries(queryClient, id)
    },
  })
}

export function useRenameRecording() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateRecording(id, { title }),
    onSuccess: (_data, { id }) => {
      invalidateRecordingQueries(queryClient, id)
    },
  })
}

export function useDeleteRecording() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteRecording,
    onSuccess: () => {
      invalidateRecordingQueries(queryClient)
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
