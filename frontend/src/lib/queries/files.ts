import { queryOptions } from "@tanstack/react-query"
import { listTranscripts } from "@/lib/api"
import {
  sortByUpdatedAt,
  transcriptSummaries,
  type FileSummary,
} from "@/lib/files"

export type FilesQueryData = {
  items: FileSummary[]
}

export function filesQuery() {
  return queryOptions({
    queryKey: ["files"],
    queryFn: async (): Promise<FilesQueryData> => {
      const transcripts = await listTranscripts()
      return {
        items: sortByUpdatedAt(transcriptSummaries(transcripts.items)),
      }
    },
  })
}
