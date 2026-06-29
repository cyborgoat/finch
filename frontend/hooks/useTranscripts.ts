"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  deleteTranscript,
  getTranscript,
  listTranscripts,
  updateTranscript,
} from "@/lib/api"
import type { Transcript, TranscriptSummary } from "@/lib/types"

function hasTranscribingItems(items: TranscriptSummary[] | undefined) {
  return items?.some((item) => item.status === "transcribing") ?? false
}

export function useTranscripts() {
  return useQuery({
    queryKey: ["transcripts"],
    queryFn: listTranscripts,
    refetchInterval: (query) =>
      hasTranscribingItems(query.state.data?.items) ? 2000 : false,
  })
}

export function useTranscript(id: string) {
  return useQuery({
    queryKey: ["transcripts", id],
    queryFn: () => getTranscript(id),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === "transcribing" ? 2000 : false,
  })
}

export function useUpdateTranscript(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: Partial<Pick<Transcript, "title" | "editedText" | "status">>,
    ) => updateTranscript(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transcripts"] })
      queryClient.invalidateQueries({ queryKey: ["transcripts", id] })
    },
  })
}

export function useDeleteTranscript() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTranscript,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transcripts"] })
    },
  })
}

export function useInvalidateTranscripts() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["transcripts"] })
  }
}
