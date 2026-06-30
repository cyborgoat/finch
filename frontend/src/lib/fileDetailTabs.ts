export type FileDetailTab = "source" | "summary" | "ai"

export function parseFileDetailTab(value: unknown): FileDetailTab {
  if (value === "summary" || value === "ai") return value
  return "source"
}

export function fileDetailTabSearch(
  tab: FileDetailTab,
): { tab: FileDetailTab } | Record<string, never> {
  return tab === "source" ? {} : { tab }
}
