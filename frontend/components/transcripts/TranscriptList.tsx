"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TranscriptSummary } from "@/lib/types"

type TranscriptListProps = {
  items: TranscriptSummary[]
  onDelete?: (id: string) => void
}

function statusLabel(status: TranscriptSummary["status"]) {
  if (status === "transcribing") return "Transcribing…"
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
      {items.map((item) => {
        const isTranscribing = item.status === "transcribing"

        return (
          <Card
            key={item.id}
            className={`transition-colors ${
              isTranscribing ? "border-primary/30 bg-muted/20" : "hover:bg-muted/30"
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
        )
      })}
    </div>
  )
}

export function RecentTranscriptList({ items }: { items: TranscriptSummary[] }) {
  const recent = items.slice(0, 5)
  return <TranscriptList items={recent} />
}
