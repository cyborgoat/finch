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
import { formatDuration } from "@/components/audio/AudioUploader"
import { EmptyState } from "@/components/effects/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TranscriptRowActions } from "@/components/transcripts/TranscriptRowActions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { TranscriptSummary } from "@/lib/types"

type TranscriptTableVariant = "default" | "recent"

type TranscriptTableProps = {
  items: TranscriptSummary[]
  onRename?: (id: string, title: string) => void | Promise<void>
  onDelete?: (id: string) => void
  isRenaming?: boolean
  isDeleting?: boolean
  variant?: TranscriptTableVariant
  limit?: number
}

function SortableHeader({
  label,
  sorted,
  onToggle,
  large,
}: {
  label: string
  sorted: false | "asc" | "desc"
  onToggle: (event: unknown) => void
  large?: boolean
}) {
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown

  return (
    <Button
      variant="ghost"
      size={large ? "default" : "sm"}
      className={cn("-ml-2", large ? "h-10 text-base font-normal" : "h-8 font-medium")}
      onClick={onToggle}
    >
      {label}
      <Icon className={cn("text-muted-foreground", large ? "size-4" : "size-3.5")} />
    </Button>
  )
}

function useTranscriptColumns(
  onRename: TranscriptTableProps["onRename"],
  onDelete: TranscriptTableProps["onDelete"],
  isRenaming: TranscriptTableProps["isRenaming"],
  isDeleting: TranscriptTableProps["isDeleting"],
  variant: TranscriptTableVariant,
) {
  const isRecent = variant === "recent"

  return useMemo<ColumnDef<TranscriptSummary>[]>(
    () => [
      {
        id: "title",
        header: "Title",
        enableSorting: false,
        accessorFn: (row) => row.title,
        cell: ({ row }) => {
          const item = row.original
          const isTranscribing = item.status === "transcribing"
          const isFailed = item.status === "failed"

          return (
            <div className="min-w-[12rem] max-w-md whitespace-normal">
              {isTranscribing ? (
                <span
                  className={cn(
                    "text-muted-foreground",
                    isRecent ? "text-base font-light" : "font-medium",
                  )}
                >
                  {item.title}
                </span>
              ) : (
                <Link
                  to="/transcripts/$id"
                  params={{ id: item.id }}
                  className={cn(
                    "hover:underline",
                    isRecent ? "text-base font-light" : "font-medium",
                  )}
                >
                  {item.title}
                </Link>
              )}
              {isTranscribing ? (
                <p
                  className={cn(
                    "mt-1.5 leading-relaxed text-muted-foreground",
                    isRecent ? "text-sm font-light" : "text-xs",
                  )}
                >
                  Transcription is running locally. This usually takes a moment.
                </p>
              ) : null}
              {isFailed && item.errorMessage ? (
                <p className={cn("mt-1.5 text-destructive", isRecent ? "text-sm font-light" : "text-xs")}>
                  {item.errorMessage}
                </p>
              ) : null}
            </div>
          )
        },
      },
      {
        id: "createdAt",
        header: isRecent ? "Updated" : "Created",
        enableSorting: !isRecent,
        accessorFn: (row) =>
          new Date(isRecent ? row.updatedAt : row.createdAt).getTime(),
        cell: ({ row }) => (
          <span
            className={cn(
              "text-muted-foreground",
              isRecent && "text-base font-light",
            )}
          >
            {new Date(
              isRecent ? row.original.updatedAt : row.original.createdAt,
            ).toLocaleString()}
          </span>
        ),
      },
      {
        id: "duration",
        header: "Length",
        enableSorting: !isRecent,
        accessorFn: (row) => row.durationSeconds ?? -1,
        cell: ({ row }) => {
          const item = row.original

          return (
            <span
              className={cn(
                "tabular-nums text-muted-foreground",
                isRecent && "text-base font-light",
              )}
            >
              {formatDuration(item.durationSeconds ?? undefined)}
            </span>
          )
        },
      },
      {
        id: "language",
        header: "Language",
        enableSorting: false,
        accessorFn: (row) => row.language ?? "",
        cell: ({ row }) =>
          row.original.language ? (
            <Badge variant="secondary" className={cn(isRecent && "text-sm font-normal")}>
              {row.original.language}
            </Badge>
          ) : (
            <span className={cn("text-muted-foreground", isRecent && "text-base font-light")}>—</span>
          ),
      },
      ...(onRename || onDelete
        ? [
            {
              id: "actions",
              header: () => <span className="sr-only">Actions</span>,
              enableSorting: false,
              cell: ({ row }: { row: { original: TranscriptSummary } }) => {
                const item = row.original
                if (item.status === "transcribing") return null

                return (
                  <TranscriptRowActions
                    item={item}
                    onRename={onRename ?? (() => undefined)}
                    onDelete={onDelete ?? (() => undefined)}
                    isRenaming={isRenaming}
                    isDeleting={isDeleting}
                  />
                )
              },
            } satisfies ColumnDef<TranscriptSummary>,
          ]
        : []),
    ],
    [onRename, onDelete, isRenaming, isDeleting, isRecent],
  )
}

export function TranscriptTable({
  items,
  onRename,
  onDelete,
  isRenaming,
  isDeleting,
  variant = "default",
  limit,
}: TranscriptTableProps) {
  const isRecent = variant === "recent"
  const data = useMemo(() => {
    if (limit == null) return items
    return [...items]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, limit)
  }, [items, limit])

  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ])

  const columns = useTranscriptColumns(onRename, onDelete, isRenaming, isDeleting, variant)

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: isRecent ? undefined : setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: isRecent ? undefined : getSortedRowModel(),
  })

  if (data.length === 0) {
    if (isRecent) {
      return (
        <p className="text-base font-light text-muted-foreground">
          No transcripts yet. Record or upload audio to get started.
        </p>
      )
    }

    return (
      <EmptyState
        title="No transcripts yet"
        description="Upload or record audio to get started."
      />
    )
  }

  return (
    <div className={cn("rounded-xl bg-card/50", !isRecent && "border")}>
      <Table className={cn(isRecent && "text-base font-light")}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort()
                const sorted = header.column.getIsSorted()

                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      isRecent && "h-12 px-4 text-base font-normal text-muted-foreground",
                    )}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <SortableHeader
                        label={String(header.column.columnDef.header)}
                        sorted={sorted}
                        large={isRecent}
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
          {table.getRowModel().rows.map((row) => {
            const item = row.original
            const isTranscribing = item.status === "transcribing"
            const isFailed = item.status === "failed"

            return (
              <TableRow
                key={row.id}
                className={cn(
                  isRecent && "h-16",
                  isTranscribing && "bg-muted/20 hover:bg-muted/25",
                  isFailed && "bg-destructive/5 hover:bg-destructive/10",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      cell.column.id === "title" && "whitespace-normal",
                      isRecent && "px-4 py-4",
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

export function RecentTranscriptList({
  items,
  onRename,
  onDelete,
  isRenaming,
  isDeleting,
}: Pick<
  TranscriptTableProps,
  "items" | "onRename" | "onDelete" | "isRenaming" | "isDeleting"
>) {
  return (
    <TranscriptTable
      items={items}
      variant="recent"
      limit={5}
      onRename={onRename}
      onDelete={onDelete}
      isRenaming={isRenaming}
      isDeleting={isDeleting}
    />
  )
}
