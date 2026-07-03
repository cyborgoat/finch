import { useTranslation } from "react-i18next"
import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { RecordingFileTable } from "@/components/files/RecordingFileTable"
import { useRecordingFileColumns } from "@/components/files/transcriptFileTableColumns"
import type { RecordingListItem } from "@/lib/recordings"

type RecentRecordingListProps = {
  items: RecordingListItem[]
  onRename?: (id: string, title: string) => void | Promise<void>
  onDelete: (id: string) => void
  onTranscribe?: (id: string, options?: { regenerate?: boolean }) => void | Promise<void>
  isRenaming?: boolean
  isDeleting?: boolean
  isTranscribing?: boolean
}

export function RecentRecordingList({
  items,
  onRename,
  onDelete,
  onTranscribe,
  isRenaming,
  isDeleting,
  isTranscribing,
}: RecentRecordingListProps) {
  const { t } = useTranslation()
  const columns = useRecordingFileColumns({
    onRename,
    onDelete,
    onTranscribe,
    isRenaming,
    isDeleting,
    isTranscribing,
  })

  // TanStack Table returns unstable function references by design.
  // eslint-disable-next-line react-hooks/incompatible-library -- table instance is scoped to this component
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (items.length === 0) {
    return (
      <p className="text-base font-light text-muted-foreground">
        {t("recordings.recentEmpty")}
      </p>
    )
  }

  return <RecordingFileTable table={table} />
}
