import { queryOptions } from "@tanstack/react-query"
import { getTranscriptionSettings } from "@/lib/api"

export function transcriptionSettingsQuery() {
  return queryOptions({
    queryKey: ["transcription-settings"],
    queryFn: getTranscriptionSettings,
  })
}
