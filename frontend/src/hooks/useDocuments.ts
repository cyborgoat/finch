
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  updateDocument,
} from "@/lib/api"
import type { Document } from "@/lib/types"

export function useDocuments(transcriptId?: string) {
  return useQuery({
    queryKey: ["documents", "list", transcriptId ?? "all"],
    queryFn: () => listDocuments(transcriptId),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? []
      return items.some((item) => item.status === "generating") ? 2000 : false
    },
  })
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ["documents", "detail", id],
    queryFn: () => getDocument(id),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === "generating" ? 2000 : false,
  })
}

export function useUpdateDocument(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<Pick<Document, "title" | "markdown">>) =>
      updateDocument(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] })
      queryClient.invalidateQueries({ queryKey: ["documents", "detail", id] })
      queryClient.invalidateQueries({ queryKey: ["files"] })
    },
  })
}

export function useCreateDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] })
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
