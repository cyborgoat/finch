
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { deleteNote, updateNote } from "@/lib/api"
import { noteQuery, notesQuery } from "@/lib/queries/notes"
import type { Note } from "@/lib/types"

export function useNotes(recordingId?: string) {
  return useQuery({
    ...notesQuery(recordingId),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? []
      return items.some((item) => item.status === "generating") ? 2000 : false
    },
  })
}

export function useNote(id: string) {
  return useQuery({
    ...noteQuery(id),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === "generating" ? 2000 : false,
  })
}

export function useUpdateNote(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<Pick<Note, "title" | "markdown">>) =>
      updateNote(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] })
      queryClient.invalidateQueries({ queryKey: ["notes", "detail", id] })
      queryClient.invalidateQueries({ queryKey: ["recordings"] })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] })
      queryClient.invalidateQueries({ queryKey: ["recordings"] })
    },
  })
}
