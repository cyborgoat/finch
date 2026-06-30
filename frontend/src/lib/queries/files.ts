import { queryOptions, type QueryClient } from "@tanstack/react-query"
import { FinchApiError } from "@/lib/api"
import {
  sortByUpdatedAt,
  transcriptSummaries,
  type FileKind,
  type FileSummary,
} from "@/lib/files"
import { documentQuery } from "@/lib/queries/documents"
import { listTranscripts } from "@/lib/api"
import { transcriptQuery } from "@/lib/queries/transcripts"

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

export async function resolveFileKind(
  queryClient: QueryClient,
  id: string,
): Promise<FileKind | null> {
  try {
    await queryClient.fetchQuery(transcriptQuery(id))
    return "transcript"
  } catch (error) {
    if (
      !(error instanceof FinchApiError) ||
      error.code !== "TRANSCRIPT_NOT_FOUND"
    ) {
      throw error
    }
  }

  try {
    await queryClient.fetchQuery(documentQuery(id))
    return "document"
  } catch (error) {
    if (
      error instanceof FinchApiError &&
      error.code === "DOCUMENT_NOT_FOUND"
    ) {
      return null
    }
    throw error
  }
}
