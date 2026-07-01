import { useTranslation } from "react-i18next"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useRecordingFileColumns } from "@/components/files/transcriptFileTableColumns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { RecordingListItem } from "@/lib/recordings"
import { cn } from "@/lib/utils"

type RecentRecordingListProps = {
  items: RecordingListItem[]
  onRename?: (id: string, title: string) => void | Promise<void>
  onDelete: (id: string) => void
  isRenaming?: boolean
  isDeleting?: boolean
}

export function RecentRecordingList({
  items,
  onRename,
  onDelete,
  isRenaming,
  isDeleting,
}: RecentRecordingListProps) {
  const { t } = useTranslation()
  const columns = useRecordingFileColumns({
    onRename,
    onDelete,
    isRenaming,
    isDeleting,
  })

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

  return (
    <div className="overflow-x-auto rounded-xl bg-card/50">
      <Table className="text-base font-light">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="h-12 px-4 text-base font-normal text-muted-foreground"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => {
            const item = row.original
            const isTranscribing = item.status === "transcribing"
            const isFailed = item.status === "failed"

            return (
              <TableRow
                key={row.id}
                className={cn(
                  "h-16",
                  isTranscribing && "bg-muted/20 hover:bg-muted/25",
                  isFailed && "bg-destructive/5 hover:bg-destructive/10",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "px-4 py-4",
                      cell.column.id === "title" && "whitespace-normal",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
