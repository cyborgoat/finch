import type { QueryClient } from "@tanstack/react-query"
import type { Note, NoteSummary } from "@/lib/types"

export function noteToSummary(note: Note): NoteSummary {
  return {
    id: note.id,
    recordingId: note.recordingId,
    title: note.title,
    type: note.type,
    model: note.model,
    status: note.status,
    generationJobId: note.generationJobId ?? null,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}

export function seedNoteInCache(
  queryClient: QueryClient,
  recordingId: string,
  note: Note,
) {
  queryClient.setQueryData(["notes", "detail", note.id], note)
  queryClient.setQueryData(
    ["notes", "list", recordingId],
    (current: { items: NoteSummary[] } | undefined) => {
      const summary = noteToSummary(note)
      const items = current?.items ?? []
      const index = items.findIndex((item) => item.id === note.id)
      if (index >= 0) {
        const next = [...items]
        next[index] = summary
        return { items: next }
      }
      return { items: [summary, ...items] }
    },
  )
  void queryClient.invalidateQueries({ queryKey: ["recordings"] })
}
