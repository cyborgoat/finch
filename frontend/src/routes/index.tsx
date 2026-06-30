import { createFileRoute } from "@tanstack/react-router"
import { toast } from "sonner"
import {
  useDeleteTranscript,
  useRenameTranscript,
  useTranscripts,
} from "@/hooks/useTranscripts"
import { RecentTranscriptList } from "@/components/transcripts/TranscriptList"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { transcriptsQuery } from "@/lib/queries/transcripts"

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(transcriptsQuery()),
  component: HomePage,
})

function HomePage() {
  const { data: transcripts, isLoading: transcriptsLoading } = useTranscripts()
  const deleteMutation = useDeleteTranscript()
  const renameMutation = useRenameTranscript()

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
        title="Recent"
        description="Your latest transcripts, sorted by most recently updated."
      />

      {transcriptsLoading ? (
        <Skeleton className="h-56 w-full rounded-xl" />
      ) : (
        <RecentTranscriptList
          items={transcripts?.items ?? []}
          onRename={(id, title) => void handleRename(id, title)}
          onDelete={(id) => void handleDelete(id)}
          isRenaming={renameMutation.isPending}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </PageContainer>
  )
}
