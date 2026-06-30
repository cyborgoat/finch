import { Link } from "@tanstack/react-router"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { useMemo, useState } from "react"
import { DocumentRowActions } from "@/components/documents/DocumentRowActions"
import { EmptyState } from "@/components/effects/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { DocumentSummary } from "@/lib/types"

type DocumentTableProps = {
  items: DocumentSummary[]
  onDelete?: (id: string) => void
  isDeleting?: boolean
}

function typeLabel(type: DocumentSummary["type"]) {
  return type.replaceAll("_", " ")
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

function useDocumentColumns(
  onDelete: DocumentTableProps["onDelete"],
  isDeleting: DocumentTableProps["isDeleting"],
) {
  return useMemo<ColumnDef<DocumentSummary>[]>(
    () => [
      {
        id: "title",
        header: "Title",
        enableSorting: false,
        accessorFn: (row) => row.title,
        cell: ({ row }) => (
          <div className="min-w-48 max-w-md whitespace-normal">
            <Link
              to="/documents/$id"
              params={{ id: row.original.id }}
              className="text-base font-light hover:underline"
            >
              {row.original.title}
            </Link>
          </div>
        ),
      },
      {
        id: "type",
        header: "Type",
        enableSorting: false,
        accessorFn: (row) => row.type,
        cell: ({ row }) => (
          <Badge variant="outline" className="text-sm font-normal capitalize">
            {typeLabel(row.original.type)}
          </Badge>
        ),
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
      ...(onDelete
        ? [
            {
              id: "actions",
              header: () => <span className="sr-only">Actions</span>,
              enableSorting: false,
              cell: ({ row }: { row: { original: DocumentSummary } }) => (
                <DocumentRowActions
                  item={row.original}
                  onDelete={onDelete}
                  isDeleting={isDeleting}
                />
              ),
            } satisfies ColumnDef<DocumentSummary>,
          ]
        : []),
    ],
    [onDelete, isDeleting],
  )
}

export function DocumentTable({ items, onDelete, isDeleting }: DocumentTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "updatedAt", desc: true },
  ])

  const columns = useDocumentColumns(onDelete, isDeleting)

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (items.length === 0) {
    return (
      <EmptyState
        title="No documents yet"
        description="Run an AI action from a transcript to generate Markdown."
      />
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
