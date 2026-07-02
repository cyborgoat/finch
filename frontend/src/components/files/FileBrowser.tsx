import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { EmptyState } from "@/components/effects/EmptyState"
import { useRecordingFileColumns } from "@/components/files/transcriptFileTableColumns"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { filterRecordings, type RecordingListItem } from "@/lib/recordings"
import { cn } from "@/lib/utils"

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

function SortableHeader({
  label,
  sorted,
  onToggle,
}: {
  label: string
  sorted: false | "asc" | "desc"
  onToggle: (event: unknown) => void
}) {
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown

  return (
    <Button
      variant="ghost"
      size="default"
      className="-ml-2 h-10 text-base font-normal"
      onClick={onToggle}
    >
      {label}
      <Icon className="size-4 text-muted-foreground" />
    </Button>
  )
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

  return (
    <div className="overflow-x-auto rounded-xl bg-card/50">
      <Table className="text-base font-light">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort()
                const sorted = header.column.getIsSorted()

                return (
                  <TableHead
                    key={header.id}
                    className="h-12 px-4 text-base font-normal text-muted-foreground"
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <SortableHeader
                        label={String(header.column.columnDef.header)}
                        sorted={sorted}
                        onToggle={
                          header.column.getToggleSortingHandler() ??
                          (() => undefined)
                        }
                      />
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="h-16">
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
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
