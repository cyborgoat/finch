import { useNavigate } from "@tanstack/react-router"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useStartTranscription } from "@/hooks/useRecordings"

export function useStartTranscriptionFlow() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const startTranscriptionMutation = useStartTranscription()

  const startTranscriptionFlow = useCallback(
    async (
      recordingId: string,
      options?: { regenerate?: boolean; navigateToDetail?: boolean },
    ) => {
      try {
        const result = await startTranscriptionMutation.mutateAsync({
          recordingId,
          language: "auto",
          regenerate: options?.regenerate,
        })
        toast.message(
          options?.regenerate
            ? t("toasts.transcriptionRegenerating")
            : t("toasts.transcriptionStarted"),
        )
        if (options?.navigateToDetail !== false) {
          void navigate({
            to: "/recordings/$id",
            params: { id: recordingId },
            search: { jobId: result.jobId },
          })
        }
        return result
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("toasts.failedToStartJob"))
        return null
      }
    },
    [navigate, startTranscriptionMutation, t],
  )

  return {
    startTranscriptionFlow,
    isStarting: startTranscriptionMutation.isPending,
  }
}
