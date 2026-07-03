import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table"
import { Mic, Upload } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { EmptyState } from "@/components/effects/EmptyState"
import { RecordingFileTable } from "@/components/files/RecordingFileTable"
import { useRecordingFileColumns } from "@/components/files/transcriptFileTableColumns"
import { useNewRecordingDialogs } from "@/components/layout/NewRecordingDialogs"
import { Button } from "@/components/ui/button"
import { filterRecordings, type RecordingListItem } from "@/lib/recordings"

type RecordingBrowserProps = {
  items: RecordingListItem[]
  query?: string
  onRename?: (id: string, title: string) => void | Promise<void>
  onDelete: (id: string) => void
  onTranscribe?: (id: string, options?: { regenerate?: boolean }) => void | Promise<void>
  isRenaming?: boolean
  isDeleting?: boolean
  isTranscribing?: boolean
}

export function RecordingBrowser({
  items,
  query = "",
  onRename,
  onDelete,
  onTranscribe,
  isRenaming,
  isDeleting,
  isTranscribing,
}: RecordingBrowserProps) {
  const { t } = useTranslation()
  const { openUploadDialog, openRecordDialog } = useNewRecordingDialogs()
  const data = useMemo(() => filterRecordings(items, query), [items, query])
  const [sorting, setSorting] = useState<SortingState>([
    { id: "updatedAt", desc: true },
  ])

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
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (items.length === 0) {
    return (
      <EmptyState
        title={t("recordings.emptyTitle")}
        description={t("recordings.emptyDescription")}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" onClick={openRecordDialog}>
              <Mic className="size-4" />
              {t("nav.recordVoice")}
            </Button>
            <Button size="sm" variant="outline" onClick={openUploadDialog}>
              <Upload className="size-4" />
              {t("nav.uploadAudio")}
            </Button>
          </div>
        }
      />
    )
  }

  if (data.length === 0) {
    return (
      <p className="text-base font-light text-muted-foreground">
        {t("recordings.noSearchResults")}
      </p>
    )
  }

  return <RecordingFileTable table={table} sortable />
}
