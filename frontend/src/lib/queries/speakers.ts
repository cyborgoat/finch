import { queryOptions } from "@tanstack/react-query"
import {
  getSpeakerMemoryStatus,
  listSpeakerProfiles,
} from "@/lib/api"

export function speakerProfilesQuery() {
  return queryOptions({
    queryKey: ["speaker-profiles"],
    queryFn: listSpeakerProfiles,
  })
}

export function speakerMemoryStatusQuery() {
  return queryOptions({
    queryKey: ["speaker-memory-status"],
    queryFn: getSpeakerMemoryStatus,
  })
}
