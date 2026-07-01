export type FileDetailTab = "source" | "notes"

export function parseFileDetailTab(value: unknown): FileDetailTab {
  if (value === "notes" || value === "summary" || value === "ai") return "notes"
  return "source"
}

export function fileDetailTabSearch(
  tab: FileDetailTab,
  noteId?: string | null,
): { tab: FileDetailTab; noteId?: string } | Record<string, never> {
  if (tab === "source") return {}
  if (noteId) return { tab, noteId }
  return { tab }
}
