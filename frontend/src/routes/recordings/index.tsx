import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { RecordingBrowser } from "@/components/files/FileBrowser"
import { PageContainer } from "@/components/layout/PageContainer"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useRecordingsList } from "@/hooks/useRecordingsList"
import {
  useDeleteRecording,
  useRenameRecording,
} from "@/hooks/useRecordings"
import { recordingsListQuery } from "@/lib/queries/recordingsList"

export const Route = createFileRoute("/recordings/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(recordingsListQuery()),
  component: FilesPage,
})

function FilesPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useRecordingsList()
  const deleteRecordingMutation = useDeleteRecording()
  const renameMutation = useRenameRecording()
  const [query, setQuery] = useState("")

  const items = useMemo(() => data?.items ?? [], [data?.items])

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
      <div className="mb-6 flex justify-end">
        <Input
          placeholder={t("common.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full min-w-[200px] max-w-xs"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : (
        <RecordingBrowser
          items={items}
          query={query}
          onRename={(id, title) => void handleRename(id, title)}
          onDelete={(id) => void handleDelete(id)}
          isRenaming={renameMutation.isPending}
          isDeleting={deleteRecordingMutation.isPending}
        />
      )}
    </PageContainer>
  )
}
