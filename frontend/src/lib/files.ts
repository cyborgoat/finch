import type { TranscriptSummary } from "@/lib/types"

export type FileKind = "transcript" | "document"

export function resolveFileKind(id: string): FileKind | null {
  if (id.startsWith("transcript_")) return "transcript"
  if (id.startsWith("doc_")) return "document"
  return null
}

export type FileSummary = {
  id: string
  kind: FileKind
  title: string
  updatedAt: string
  createdAt: string
  status?: TranscriptSummary["status"]
  durationSeconds?: number | null
  language?: string | null
  errorMessage?: string | null
}

export function transcriptSummaries(items: TranscriptSummary[]): FileSummary[] {
  return items.map((item) => ({
    id: item.id,
    kind: "transcript",
    title: item.title,
    updatedAt: item.updatedAt,
    createdAt: item.createdAt,
    status: item.status,
    durationSeconds: item.durationSeconds,
    language: item.language,
    errorMessage: item.errorMessage,
  }))
}

export function sortByUpdatedAt(items: FileSummary[]): FileSummary[] {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export function recentTranscriptFiles(items: FileSummary[], limit: number): FileSummary[] {
  return sortByUpdatedAt(items).slice(0, limit)
}

export function filterFiles(items: FileSummary[], query: string): FileSummary[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => item.title.toLowerCase().includes(q))
}
