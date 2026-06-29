"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { TranscriptList } from "@/components/transcripts/TranscriptList"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useDeleteTranscript, useTranscripts } from "@/hooks/useTranscripts"

export default function TranscriptsPage() {
  const { data, isLoading } = useTranscripts()
  const deleteMutation = useDeleteTranscript()
  const [query, setQuery] = useState("")

  const items = useMemo(() => {
    const all = data?.items ?? []
    if (!query.trim()) return all
    const q = query.toLowerCase()
    return all.filter((t) => t.title.toLowerCase().includes(q))
  }, [data?.items, query])

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transcript?")) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Transcript deleted")
    } catch {
      toast.error("Failed to delete transcript")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Transcripts</h1>
        <p className="text-sm text-muted-foreground">
          Browse and manage your transcribed audio.
        </p>
      </div>

      <Input
        placeholder="Search by title…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <TranscriptList
          items={items}
          onDelete={(id) => void handleDelete(id)}
        />
      )}
    </div>
  )
}
