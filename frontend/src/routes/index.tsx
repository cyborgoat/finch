import { createFileRoute } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { RecentRecordingList } from "@/components/files/RecentFileList"
import { PageContainer } from "@/components/layout/PageContainer"
import { Skeleton } from "@/components/ui/skeleton"
import { useRecentRecordings } from "@/hooks/useRecordingsList"
import {
  useDeleteRecording,
  useRenameRecording,
} from "@/hooks/useRecordings"
import { recordingsListQuery } from "@/lib/queries/recordingsList"

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(recordingsListQuery()),
  component: HomePage,
})

function HomePage() {
  const { t } = useTranslation()
  const { data: items, isLoading } = useRecentRecordings(8)
  const deleteRecordingMutation = useDeleteRecording()
  const renameMutation = useRenameRecording()

  const handleRename = async (id: string, title: string) => {
    try {
      await renameMutation.mutateAsync({ id, title })
      toast.success(t("toasts.recordingRenamed"))
    } catch {
      toast.error(t("toasts.recordingRenameFailed"))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteRecordingMutation.mutateAsync(id)
      toast.success(t("toasts.recordingDeleted"))
    } catch {
      toast.error(t("toasts.recordingDeleteFailed"))
    }
  }

  return (
    <PageContainer size="wide">
      {isLoading ? (
        <Skeleton className="h-56 w-full rounded-xl" />
      ) : (
        <RecentRecordingList
          items={items ?? []}
          onRename={(id, title) => void handleRename(id, title)}
          onDelete={(id) => void handleDelete(id)}
          isRenaming={renameMutation.isPending}
          isDeleting={deleteRecordingMutation.isPending}
        />
      )}
    </PageContainer>
  )
}
