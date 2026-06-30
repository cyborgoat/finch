import { useQuery } from "@tanstack/react-query"
import { recentTranscriptFiles, type FileSummary } from "@/lib/files"
import { filesQuery } from "@/lib/queries/files"

function hasTranscribing(items: FileSummary[]) {
  return items.some((item) => item.status === "transcribing")
}

export function useFiles() {
  return useQuery({
    ...filesQuery(),
    refetchInterval: (query) =>
      hasTranscribing(query.state.data?.items ?? []) ? 2000 : false,
  })
}

export function useRecentFiles(limit = 8) {
  const { data, ...rest } = useFiles()
  return {
    ...rest,
    data: data ? recentTranscriptFiles(data.items, limit) : undefined,
  }
}
