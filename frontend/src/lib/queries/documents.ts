import { queryOptions } from "@tanstack/react-query"
import { listDocuments, getDocument } from "@/lib/api"

export function documentsQuery(transcriptId?: string) {
  return queryOptions({
    queryKey: ["documents", transcriptId ?? "all"],
    queryFn: () => listDocuments(transcriptId),
  })
}

export function documentQuery(id: string) {
  return queryOptions({
    queryKey: ["documents", id],
    queryFn: () => getDocument(id),
  })
}
