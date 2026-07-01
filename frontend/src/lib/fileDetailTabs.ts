export type FileDetailTab = "source" | "summary"

export function parseFileDetailTab(value: unknown): FileDetailTab {
  if (value === "summary" || value === "ai") return "summary"
  return "source"
}

export function fileDetailTabSearch(
  tab: FileDetailTab,
): { tab: FileDetailTab } | Record<string, never> {
  return tab === "source" ? {} : { tab }
}
