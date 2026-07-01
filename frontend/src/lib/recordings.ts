import type { RecordingSummary as ApiRecordingSummary } from "@/lib/types"

export type RecordingKind = "recording"

export function resolveRecordingKind(id: string): RecordingKind | null {
  if (id.startsWith("recording_")) return "recording"
  return null
}

export type RecordingListItem = ApiRecordingSummary & {
  kind: RecordingKind
}

export function recordingSummaries(items: ApiRecordingSummary[]): RecordingListItem[] {
  return items.map((item) => ({
    ...item,
    kind: "recording" as const,
  }))
}

export function sortByUpdatedAt(items: RecordingListItem[]): RecordingListItem[] {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export function recentRecordings(items: RecordingListItem[], limit: number): RecordingListItem[] {
  return sortByUpdatedAt(items).slice(0, limit)
}

export function filterRecordings(items: RecordingListItem[], query: string): RecordingListItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => item.title.toLowerCase().includes(q))
}
