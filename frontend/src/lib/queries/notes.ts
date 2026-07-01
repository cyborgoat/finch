import { queryOptions } from "@tanstack/react-query"
import { listNotes, getNote } from "@/lib/api"

export function notesQuery(recordingId?: string) {
  return queryOptions({
    queryKey: ["notes", "list", recordingId ?? "all"],
    queryFn: () => listNotes(recordingId),
  })
}

export function noteQuery(id: string) {
  return queryOptions({
    queryKey: ["notes", "detail", id],
    queryFn: () => getNote(id),
  })
}
