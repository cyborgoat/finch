import { queryOptions } from "@tanstack/react-query"
import { listDocuments, getDocument } from "@/lib/api"

export function documentsQuery(transcriptId?: string) {
  return queryOptions({
    queryKey: ["documents", "list", transcriptId ?? "all"],
    queryFn: () => listDocuments(transcriptId),
  })
}

export function documentQuery(id: string) {
  return queryOptions({
    queryKey: ["documents", "detail", id],
    queryFn: () => getDocument(id),
  })
}
