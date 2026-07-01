import type { QueryClient } from "@tanstack/react-query"
import type { Document, DocumentSummary } from "@/lib/types"

export function documentToSummary(document: Document): DocumentSummary {
  return {
    id: document.id,
    transcriptId: document.transcriptId,
    title: document.title,
    type: document.type,
    model: document.model,
    status: document.status,
    generationJobId: document.generationJobId ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  }
}

export function seedDocumentInCache(
  queryClient: QueryClient,
  transcriptId: string,
  document: Document,
) {
  queryClient.setQueryData(["documents", "detail", document.id], document)
  queryClient.setQueryData(
    ["documents", "list", transcriptId],
    (current: { items: DocumentSummary[] } | undefined) => {
      const summary = documentToSummary(document)
      const items = current?.items ?? []
      const index = items.findIndex((item) => item.id === document.id)
      if (index >= 0) {
        const next = [...items]
        next[index] = summary
        return { items: next }
      }
      return { items: [summary, ...items] }
    },
  )
  void queryClient.invalidateQueries({ queryKey: ["files"] })
}
