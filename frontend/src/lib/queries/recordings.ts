import { queryOptions } from "@tanstack/react-query"
import { getRecording } from "@/lib/api"

export function recordingQuery(id: string) {
  return queryOptions({
    queryKey: ["recordings", id],
    queryFn: () => getRecording(id),
  })
}
