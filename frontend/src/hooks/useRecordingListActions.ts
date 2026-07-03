import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { useStartTranscriptionFlow } from "@/hooks/useStartTranscriptionFlow"
import {
  useDeleteRecording,
  useRenameRecording,
} from "@/hooks/useRecordings"

export function useRecordingListActions() {
  const { t } = useTranslation()
  const deleteRecordingMutation = useDeleteRecording()
  const renameMutation = useRenameRecording()
  const { startTranscriptionFlow, isStarting } = useStartTranscriptionFlow()

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

  const handleTranscribe = async (
    id: string,
    options?: { regenerate?: boolean },
  ) => {
    await startTranscriptionFlow(id, options)
  }

  return {
    handleRename,
    handleDelete,
    handleTranscribe,
    isRenaming: renameMutation.isPending,
    isDeleting: deleteRecordingMutation.isPending,
    isTranscribing: isStarting,
  }
}
