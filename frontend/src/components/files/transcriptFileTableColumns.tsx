import { Link } from "@tanstack/react-router"
import { type ColumnDef } from "@tanstack/react-table"
import { Folder } from "lucide-react"
import { useMemo } from "react"
import { formatDuration } from "@/components/audio/AudioUploader"
import { FileRowActions } from "@/components/files/FileRowActions"
import { Badge } from "@/components/ui/badge"
import type { FileSummary } from "@/lib/files"

type TranscriptFileTableActions = {
  onRename?: (id: string, title: string) => void | Promise<void>
  onDelete: (id: string) => void
  isRenaming?: boolean
  isDeleting?: boolean
  showTranscribingDetail?: boolean
}

export function useTranscriptFileColumns({
  onRename,
  onDelete,
  isRenaming,
  isDeleting,
  showTranscribingDetail = false,
}: TranscriptFileTableActions) {
  return useMemo<ColumnDef<FileSummary>[]>(
    () => [
      {
        id: "title",
        header: "Name",
        enableSorting: false,
        accessorFn: (row) => row.title,
        cell: ({ row }) => {
          const item = row.original
          const isTranscribing = item.status === "transcribing"
          const isFailed = item.status === "failed"

          return (
            <div className="flex min-w-48 max-w-md items-start gap-2 whitespace-normal">
              <Folder className="mt-1 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                {isTranscribing ? (
                  <span className="text-base font-light text-muted-foreground">
                    {item.title}
                  </span>
                ) : (
                  <Link
                    to="/files/$id"
                    params={{ id: item.id }}
                    className="text-base font-light hover:underline"
                  >
                    {item.title}
                  </Link>
                )}
                {showTranscribingDetail && isTranscribing ? (
                  <p className="mt-1.5 text-sm font-light leading-relaxed text-muted-foreground">
                    Transcription is running locally. This usually takes a moment.
                  </p>
                ) : null}
                {showTranscribingDetail && isFailed && item.errorMessage ? (
                  <p className="mt-1.5 text-sm font-light text-destructive">
                    {item.errorMessage}
                  </p>
                ) : null}
              </div>
            </div>
          )
        },
      },
      {
        id: "updatedAt",
        header: "Updated",
        enableSorting: true,
        accessorFn: (row) => new Date(row.updatedAt).getTime(),
        cell: ({ row }) => (
          <span className="text-base font-light text-muted-foreground">
            {new Date(row.original.updatedAt).toLocaleString()}
          </span>
        ),
      },
      {
        id: "duration",
        header: "Length",
        enableSorting: false,
        accessorFn: (row) => row.durationSeconds ?? -1,
        cell: ({ row }) => (
          <span className="tabular-nums text-base font-light text-muted-foreground">
            {formatDuration(row.original.durationSeconds ?? undefined)}
          </span>
        ),
      },
      {
        id: "language",
        header: "Language",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.language ? (
            <Badge variant="secondary" className="text-sm font-normal">
              {row.original.language}
            </Badge>
          ) : (
            <span className="text-base font-light text-muted-foreground">—</span>
          ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <FileRowActions
            item={row.original}
            onRename={onRename}
            onDelete={onDelete}
            isRenaming={isRenaming}
            isDeleting={isDeleting}
          />
        ),
      },
    ],
    [onDelete, isDeleting, isRenaming, onRename, showTranscribingDetail],
  )
}
