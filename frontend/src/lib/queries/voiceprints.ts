import { queryOptions } from "@tanstack/react-query"
import {
  getVoiceprintProfilesStatus,
  listVoiceprintProfiles,
} from "@/lib/api"

export function voiceprintProfilesListQuery() {
  return queryOptions({
    queryKey: ["voiceprint-profiles"],
    queryFn: listVoiceprintProfiles,
  })
}

export function voiceprintProfilesStatusQuery() {
  return queryOptions({
    queryKey: ["voiceprint-profiles-status"],
    queryFn: getVoiceprintProfilesStatus,
  })
}
