import { useMutation, useQueryClient } from "@tanstack/react-query"
import { editRecordingSource } from "@/lib/api"

function invalidateAfterEdit(
  queryClient: ReturnType<typeof useQueryClient>,
  recordingId: string,
  audioAssetId: string,
  nextRecordingId?: string,
  nextAudioAssetId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: ["recordings"] })
  void queryClient.invalidateQueries({ queryKey: ["recordings", recordingId] })
  void queryClient.invalidateQueries({ queryKey: ["audio", audioAssetId] })
  if (nextRecordingId) {
    void queryClient.invalidateQueries({ queryKey: ["recordings", nextRecordingId] })
  }
  if (nextAudioAssetId) {
    void queryClient.invalidateQueries({ queryKey: ["audio", nextAudioAssetId] })
  }
}

export function useEditRecordingSource(recordingId: string, audioAssetId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      trimStartSec?: number
      trimEndSec?: number | null
      mode: "replace" | "save_as_new"
    }) => editRecordingSource(recordingId, input),
    onSuccess: (data) => {
      invalidateAfterEdit(
        queryClient,
        recordingId,
        audioAssetId,
        data.recordingId,
        data.audioAssetId,
      )
    },
  })
}
