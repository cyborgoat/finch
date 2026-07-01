import { createFileRoute } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation()
  const { data: items, isLoading } = useRecentFiles(8)
  const deleteTranscriptMutation = useDeleteTranscript()
  const renameMutation = useRenameTranscript()

  const handleRename = async (id: string, title: string) => {
    try {
      await renameMutation.mutateAsync({ id, title })
      toast.success(t("toasts.fileRenamed"))
    } catch {
      toast.error(t("toasts.fileRenameFailed"))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTranscriptMutation.mutateAsync(id)
      toast.success(t("toasts.fileDeleted"))
    } catch {
      toast.error(t("toasts.fileDeleteFailed"))
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
