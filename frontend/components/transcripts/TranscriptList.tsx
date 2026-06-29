"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      <p className="text-sm text-muted-foreground">
        No transcripts yet. Upload or record audio to get started.
      </p>
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
            transition={{ delay: index * 0.03, duration: 0.2 }}
          >
          <Card
            className={`transition-colors ${
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
                    <Link href={`/transcripts/${item.id}`} className="hover:underline">
                      {item.title}
                    </Link>
                  )}
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
                {isTranscribing && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Transcription is running locally. This usually takes a moment.
                  </p>
                )}
                {isFailed && item.errorMessage && (
                  <p className="mt-2 text-xs text-destructive">{item.errorMessage}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {item.language && <Badge variant="secondary">{item.language}</Badge>}
                <StatusBadge status={item.status} />
              </div>
            </CardHeader>
            {onDelete && !isTranscribing && (
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
          </motion.div>
        )
      })}
    </div>
  )
}

export function RecentTranscriptList({ items }: { items: TranscriptSummary[] }) {
  const recent = items.slice(0, 5)
  return <TranscriptList items={recent} />
}
