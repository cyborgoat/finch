export type RecordingDetailTab = "source" | "notes"

export function parseRecordingDetailTab(value: unknown): RecordingDetailTab {
  if (value === "notes" || value === "summary" || value === "ai") return "notes"
  return "source"
}

export function recordingDetailTabSearch(
  tab: RecordingDetailTab,
  noteId?: string | null,
): { tab: RecordingDetailTab; noteId?: string } | Record<string, never> {
  if (tab === "source") return {}
  if (noteId) return { tab, noteId }
  return { tab }
}
