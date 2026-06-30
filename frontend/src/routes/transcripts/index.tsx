import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { TranscriptTable } from "@/components/transcripts/TranscriptList"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useDeleteTranscript,
  useRenameTranscript,
  useTranscripts,
} from "@/hooks/useTranscripts"
import { transcriptsQuery } from "@/lib/queries/transcripts"
import type { TranscriptSummary } from "@/lib/types"

export const Route = createFileRoute("/transcripts/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(transcriptsQuery()),
  component: TranscriptsPage,
})

function TranscriptsPage() {
  const { data, isLoading } = useTranscripts()
  const deleteMutation = useDeleteTranscript()
  const renameMutation = useRenameTranscript()
  const [query, setQuery] = useState("")

  const items = useMemo(() => {
    const all = data?.items ?? []
    if (!query.trim()) return all
    const q = query.toLowerCase()
    return all.filter((t: TranscriptSummary) =>
      t.title.toLowerCase().includes(q),
    )
  }, [data?.items, query])

  const handleRename = async (id: string, title: string) => {
    try {
      await renameMutation.mutateAsync({ id, title })
      toast.success("Transcript renamed")
    } catch {
      toast.error("Failed to rename transcript")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Transcript deleted")
    } catch {
      toast.error("Failed to delete transcript")
    }
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Transcripts"
        description="Browse and manage your transcribed audio."
        actions={
          <Input
            placeholder="Search by title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full min-w-[200px] max-w-xs"
          />
        }
      />

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : (
        <TranscriptTable
          items={items}
          onRename={(id, title) => void handleRename(id, title)}
          onDelete={(id) => void handleDelete(id)}
          isRenaming={renameMutation.isPending}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </PageContainer>
  )
}
