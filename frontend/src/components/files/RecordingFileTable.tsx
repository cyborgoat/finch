import { flexRender, type Table as ReactTable } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
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

type RecordingFileTableProps = {
  table: ReactTable<RecordingListItem>
  sortable?: boolean
}

export function RecordingFileTable({ table, sortable = false }: RecordingFileTableProps) {
  return (
    <div className="surface-card overflow-hidden p-0">
      <Table className="text-base font-light">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = sortable && header.column.getCanSort()
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
                          header.column.getToggleSortingHandler() ?? (() => undefined)
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
