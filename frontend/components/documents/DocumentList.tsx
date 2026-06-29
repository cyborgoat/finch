"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DocumentSummary } from "@/lib/types"

type DocumentListProps = {
  items: DocumentSummary[]
  onDelete?: (id: string) => void
}

function typeLabel(type: DocumentSummary["type"]) {
  return type.replaceAll("_", " ")
}

export function DocumentList({ items, onDelete }: DocumentListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No documents yet. Run an AI action from a transcript to generate Markdown.
      </p>
    )
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <Card key={item.id} className="transition-colors hover:bg-muted/30">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">
                <Link href={`/documents/${item.id}`} className="hover:underline">
                  {item.title}
                </Link>
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>
            <Badge variant="outline">{typeLabel(item.type)}</Badge>
          </CardHeader>
          {onDelete && (
            <CardContent className="pt-0">
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="text-xs text-destructive hover:underline"
              >
                Delete
              </button>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}

export function RecentDocumentList({ items }: { items: DocumentSummary[] }) {
  return <DocumentList items={items.slice(0, 5)} />
}

export function LinkedDocumentList({ items }: { items: DocumentSummary[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No generated documents for this transcript yet.
      </p>
    )
  }
  return <DocumentList items={items} />
}
