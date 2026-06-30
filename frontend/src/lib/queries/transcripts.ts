import { queryOptions } from "@tanstack/react-query"
import { listTranscripts, getTranscript } from "@/lib/api"

export function transcriptsQuery() {
  return queryOptions({
    queryKey: ["transcripts"],
    queryFn: listTranscripts,
  })
}

export function transcriptQuery(id: string) {
  return queryOptions({
    queryKey: ["transcripts", id],
    queryFn: () => getTranscript(id),
  })
}
