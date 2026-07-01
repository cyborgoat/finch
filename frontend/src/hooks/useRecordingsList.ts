import { useQuery } from "@tanstack/react-query"
import { recentRecordings, type RecordingListItem } from "@/lib/recordings"
import { recordingsListQuery } from "@/lib/queries/recordingsList"

function hasTranscribing(items: RecordingListItem[]) {
  return items.some((item) => item.status === "transcribing")
}

export function useRecordingsList() {
  return useQuery({
    ...recordingsListQuery(),
    refetchInterval: (query) =>
      hasTranscribing(query.state.data?.items ?? []) ? 2000 : false,
  })
}

export function useRecentRecordings(limit = 8) {
  const { data, ...rest } = useRecordingsList()
  return {
    ...rest,
    data: data ? recentRecordings(data.items, limit) : undefined,
  }
}
