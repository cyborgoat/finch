import { Link } from "@tanstack/react-router"
import { type ColumnDef } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { formatDuration } from "@/components/audio/AudioUploader"
import { RecordingRowActions } from "@/components/files/FileRowActions"
import { Badge } from "@/components/ui/badge"
import type { RecordingListItem } from "@/lib/recordings"

type RecordingFileTableActions = {
  onRename?: (id: string, title: string) => void | Promise<void>
  onDelete: (id: string) => void
  isRenaming?: boolean
  isDeleting?: boolean
  showTranscribingDetail?: boolean
}

export function useRecordingFileColumns({
  onRename,
  onDelete,
  isRenaming,
  isDeleting,
  showTranscribingDetail = false,
}: RecordingFileTableActions) {
  const { t } = useTranslation()

  return useMemo<ColumnDef<RecordingListItem>[]>(
    () => [
      {
        id: "title",
        header: t("common.name"),
        enableSorting: false,
        accessorFn: (row) => row.title,
        cell: ({ row }) => {
          const item = row.original
          const isTranscribing = item.status === "transcribing"
          const isFailed = item.status === "failed"

          return (
            <div className="min-w-48 max-w-md whitespace-normal">
              <div className="min-w-0">
                {isTranscribing ? (
                  <span className="text-base font-light text-muted-foreground">
                    {item.title}
                  </span>
                ) : (
                  <Link
                    to="/recordings/$id"
                    params={{ id: item.id }}
                    className="text-base font-light hover:underline"
                  >
                    {item.title}
                  </Link>
                )}
                {showTranscribingDetail && isTranscribing ? (
                  <p className="mt-1.5 text-sm font-light leading-relaxed text-muted-foreground">
                    {t("recordings.transcribingHint")}
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
        header: t("common.updated"),
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
        header: t("common.length"),
        enableSorting: false,
        accessorFn: (row) => row.durationSeconds ?? -1,
        cell: ({ row }) => (
          <span className="tabular-nums text-base font-light text-muted-foreground">
            {formatDuration(
              row.original.durationSeconds ?? undefined,
              t("common.notAvailable"),
            )}
          </span>
        ),
      },
      {
        id: "language",
        header: t("common.language"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.language ? (
            <Badge variant="secondary" className="text-sm font-normal">
              {row.original.language}
            </Badge>
          ) : (
            <span className="text-base font-light text-muted-foreground">
              {t("common.notAvailable")}
            </span>
          ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("common.actions")}</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <RecordingRowActions
            item={row.original}
            onRename={onRename}
            onDelete={onDelete}
            isRenaming={isRenaming}
            isDeleting={isDeleting}
          />
        ),
      },
    ],
    [onDelete, isDeleting, isRenaming, onRename, showTranscribingDetail, t],
  )
}
