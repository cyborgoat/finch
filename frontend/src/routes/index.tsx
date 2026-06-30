import { createFileRoute } from "@tanstack/react-router"
import { toast } from "sonner"
import { RecentFileList } from "@/components/files/RecentFileList"
import { PageContainer } from "@/components/layout/PageContainer"
import { Skeleton } from "@/components/ui/skeleton"
import { useRecentFiles } from "@/hooks/useFiles"
import {
  useDeleteTranscript,
  useRenameTranscript,
} from "@/hooks/useTranscripts"
import { filesQuery } from "@/lib/queries/files"

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(filesQuery()),
  component: HomePage,
})

function HomePage() {
  const { data: items, isLoading } = useRecentFiles(8)
  const deleteTranscriptMutation = useDeleteTranscript()
  const renameMutation = useRenameTranscript()

  const handleRename = async (id: string, title: string) => {
    try {
      await renameMutation.mutateAsync({ id, title })
      toast.success("File renamed")
    } catch {
      toast.error("Failed to rename file")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTranscriptMutation.mutateAsync(id)
      toast.success("File deleted")
    } catch {
      toast.error("Failed to delete file")
    }
  }

  return (
    <PageContainer size="wide">
      {isLoading ? (
        <Skeleton className="h-56 w-full rounded-xl" />
      ) : (
        <RecentFileList
          items={items ?? []}
          onRename={(id, title) => void handleRename(id, title)}
          onDelete={(id) => void handleDelete(id)}
          isRenaming={renameMutation.isPending}
          isDeleting={deleteTranscriptMutation.isPending}
        />
      )}
    </PageContainer>
  )
}
