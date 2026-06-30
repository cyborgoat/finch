import { Link } from "@tanstack/react-router"
import { motion } from "motion/react"
import { EmptyState } from "@/components/effects/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import { listStagger } from "@/lib/motion"
import type { TranscriptSummary } from "@/lib/types"

type TranscriptListProps = {
  items: TranscriptSummary[]
  onDelete?: (id: string) => void
}

function statusLabel(status: TranscriptSummary["status"]) {
  if (status === "transcribing") return "Transcribing…"
  if (status === "failed") return "Failed"
  return status
}

function StatusBadge({ status }: { status: TranscriptSummary["status"] }) {
  if (status === "transcribing") {
    return (
      <Badge variant="secondary" className="animate-pulse">
        Transcribing…
      </Badge>
    )
  }

  if (status === "failed") {
    return <Badge variant="destructive">Failed</Badge>
  }

  return <Badge variant="outline">{statusLabel(status)}</Badge>
}

export function TranscriptList({ items, onDelete }: TranscriptListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No transcripts yet"
        description="Upload or record audio to get started."
      />
    )
  }

  return (
    <div className="grid gap-3">
      {items.map((item, index) => {
        const isTranscribing = item.status === "transcribing"
        const isFailed = item.status === "failed"

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={listStagger(index)}
          >
            <Card
              className={`rounded-xl border bg-card/50 transition-colors ${
                isTranscribing
                  ? "border-primary/30 bg-muted/20"
                  : isFailed
                    ? "border-destructive/30 bg-destructive/5"
                    : "hover:bg-muted/30"
              }`}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-base">
                    {isTranscribing ? (
                      <span className="text-muted-foreground">{item.title}</span>
                    ) : (
                      <Link
                        to="/transcripts/$id"
                        params={{ id: item.id }}
                        className="hover:underline"
                      >
                        {item.title}
                      </Link>
                    )}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                  {isTranscribing ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      Transcription is running locally. This usually takes a moment.
                    </p>
                  ) : null}
                  {isFailed && item.errorMessage ? (
                    <p className="mt-2 text-xs text-destructive">{item.errorMessage}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {item.language ? <Badge variant="secondary">{item.language}</Badge> : null}
                  <StatusBadge status={item.status} />
                </div>
              </CardHeader>
              {onDelete && !isTranscribing ? (
                <CardContent className="pt-0">
                  <DeleteConfirmDialog
                    title="Delete transcript?"
                    description="This permanently removes the transcript and cannot be undone."
                    triggerLabel="Delete"
                    onConfirm={() => onDelete(item.id)}
                  />
                </CardContent>
              ) : null}
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

export function RecentTranscriptList({ items }: { items: TranscriptSummary[] }) {
  return <TranscriptList items={items.slice(0, 5)} />
}
