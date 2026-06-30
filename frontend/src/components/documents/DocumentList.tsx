import { Link } from "@tanstack/react-router"
import { motion } from "motion/react"
import { EmptyState } from "@/components/effects/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import { listStagger } from "@/lib/motion"
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
      <EmptyState
        title="No documents yet"
        description="Run an AI action from a transcript to generate Markdown."
      />
    )
  }

  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={listStagger(index)}
        >
          <Card className="rounded-xl border bg-card/50 transition-colors hover:bg-muted/30">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-base">
                  <Link
                    to="/documents/$id"
                    params={{ id: item.id }}
                    className="hover:underline"
                  >
                    {item.title}
                  </Link>
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
              <Badge variant="outline">{typeLabel(item.type)}</Badge>
            </CardHeader>
            {onDelete ? (
              <CardContent className="pt-0">
                <DeleteConfirmDialog
                  title="Delete document?"
                  description="This permanently removes the document and cannot be undone."
                  triggerLabel="Delete"
                  onConfirm={() => onDelete(item.id)}
                />
              </CardContent>
            ) : null}
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

export function RecentDocumentList({ items }: { items: DocumentSummary[] }) {
  return <DocumentList items={items.slice(0, 5)} />
}

export function LinkedDocumentList({ items }: { items: DocumentSummary[] }) {
  return <DocumentList items={items} />
}
