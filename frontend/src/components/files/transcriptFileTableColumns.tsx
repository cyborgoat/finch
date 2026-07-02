import { Link } from "@tanstack/react-router"
import { type ColumnDef } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { formatDuration } from "@/components/audio/AudioUploader"
import { RecordingRowActions } from "@/components/files/FileRowActions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TextShimmer } from "@/components/motion-primitives/text-shimmer"
import type { RecordingListItem } from "@/lib/recordings"
type RecordingFileTableActions = {
  onRename?: (id: string, title: string) => void | Promise<void>
  onDelete: (id: string) => void
  onTranscribe?: (id: string, options?: { regenerate?: boolean }) => void | Promise<void>
  isRenaming?: boolean
  isDeleting?: boolean
  isTranscribing?: boolean
}

function StatusBadge({ status }: { status: RecordingListItem["status"] }) {
  const { t } = useTranslation()

  if (status === "transcribing") {
    return (
      <Badge variant="secondary" className="text-sm font-normal">
        <TextShimmer>{t("recordings.status.transcribing")}</TextShimmer>
      </Badge>
    )
  }

  const variant =
    status === "failed"
      ? "destructive"
      : status === "pending"
        ? "outline"
        : "secondary"

  return (
    <Badge variant={variant} className="text-sm font-normal">
      {t(`recordings.status.${status}`)}
    </Badge>
  )
}

export function useRecordingFileColumns({
  onRename,
  onDelete,
  onTranscribe,
  isRenaming,
  isDeleting,
  isTranscribing,
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
          const isFailed = item.status === "failed"
          const isPending = item.status === "pending"
          const showTranscribeButton =
            onTranscribe && (isPending || isFailed) && !isTranscribing

          return (
            <div className="min-w-48 max-w-md whitespace-normal">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/recordings/$id"
                  params={{ id: item.id }}
                  className="text-base font-light hover:underline"
                >
                  {item.title}
                </Link>
                {showTranscribeButton ? (
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    disabled={isTranscribing}
                    onClick={() => void onTranscribe(item.id)}
                  >
                    {isFailed
                      ? t("recordings.retryTranscription")
                      : t("recordings.transcribe")}
                  </Button>
                ) : null}
              </div>
              {isFailed && item.errorMessage ? (
                <p className="mt-1.5 text-sm font-light text-destructive">
                  {item.errorMessage}
                </p>
              ) : null}
            </div>
          )
        },
      },
      {
        id: "status",
        header: t("common.status"),
        enableSorting: false,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
            onTranscribe={onTranscribe}
            isRenaming={isRenaming}
            isDeleting={isDeleting}
            isTranscribing={isTranscribing}
          />
        ),
      },
    ],
    [
      onDelete,
      isDeleting,
      isRenaming,
      isTranscribing,
      onRename,
      onTranscribe,
      t,
    ],
  )
}
