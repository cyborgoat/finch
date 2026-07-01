import { queryOptions } from "@tanstack/react-query"
import { listRecordings } from "@/lib/api"
import {
  sortByUpdatedAt,
  recordingSummaries,
  type RecordingListItem,
} from "@/lib/recordings"

export type RecordingsListQueryData = {
  items: RecordingListItem[]
}

export function recordingsListQuery() {
  return queryOptions({
    queryKey: ["recordings"],
    queryFn: async (): Promise<RecordingsListQueryData> => {
      const recordings = await listRecordings()
      return {
        items: sortByUpdatedAt(recordingSummaries(recordings.items)),
      }
    },
  })
}
