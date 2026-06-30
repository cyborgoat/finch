
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  deleteDocument,
  getDocument,
  listDocuments,
  updateDocument,
} from "@/lib/api"
import type { Document } from "@/lib/types"

export function useDocuments(transcriptId?: string) {
  return useQuery({
    queryKey: ["documents", transcriptId ?? "all"],
    queryFn: () => listDocuments(transcriptId),
  })
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ["documents", id],
    queryFn: () => getDocument(id),
    enabled: !!id,
  })
}

export function useUpdateDocument(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<Pick<Document, "title" | "markdown">>) =>
      updateDocument(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] })
      queryClient.invalidateQueries({ queryKey: ["documents", id] })
      queryClient.invalidateQueries({ queryKey: ["files"] })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] })
      queryClient.invalidateQueries({ queryKey: ["files"] })
    },
  })
}
