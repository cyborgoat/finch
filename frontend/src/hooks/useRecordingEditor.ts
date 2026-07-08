import { useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  useVoiceprintProfilesStatus,
  useVoiceprintProfiles,
} from "@/hooks/useVoiceprintProfiles"
import {
  useDeleteRecording,
  useUpdateRecording,
} from "@/hooks/useRecordings"
import { updateRecordingSpeakers, FinchApiError } from "@/lib/api"
import {
  profileNameById,
  resolveSpeakerSegments,
  transcriptDisplayText,
} from "@/lib/transcriptFormat"
import type { SpeakerSegment, Recording } from "@/lib/types"

export function useRecordingEditor(recording: Recording) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const updateMutation = useUpdateRecording(recording.id)
  const deleteMutation = useDeleteRecording()
  const { data: voiceprintProfilesStatus } = useVoiceprintProfilesStatus()
  const { data: profilesData } = useVoiceprintProfiles()
  const profiles = useMemo(
    () => profilesData?.items ?? [],
    [profilesData?.items],
  )
  const profileNames = useMemo(() => profileNameById(profiles), [profiles])

  const initialSegments = resolveSpeakerSegments(recording)

  const [title, setTitle] = useState(recording.title)
  const [segments, setSegments] = useState(initialSegments)
  const text = useMemo(() => {
    if (recording.editedText?.trim()) return recording.editedText
    return transcriptDisplayText(
      recording.rawText,
      recording.editedText,
      segments,
      profileNames,
    )
  }, [recording.rawText, recording.editedText, segments, profileNames])
  const [speakerSavePending, setSpeakerSavePending] = useState(false)

  const applySpeakerUpdate = (updatedSegments: SpeakerSegment[]) => {
    setSegments(updatedSegments)
    void queryClient.invalidateQueries({ queryKey: ["recordings", recording.id] })
    void queryClient.invalidateQueries({ queryKey: ["voiceprint-profiles"] })
    void queryClient.invalidateQueries({ queryKey: ["voiceprint-profiles-status"] })
  }

  const applySegmentSpeaker = async (
    clusterId: string,
    _segment: SpeakerSegment,
    payload: { displayName: string; profileId: string | null; enroll: boolean },
  ) => {
    setSpeakerSavePending(true)
    try {
      const result = await updateRecordingSpeakers(recording.id, [
        {
          clusterId,
          displayName: payload.displayName,
          profileId: payload.profileId,
          enroll: payload.enroll,
        },
      ])
      applySpeakerUpdate(result.speakerSegments ?? [])
      toast.success(
        payload.enroll
          ? t("toasts.speakerSavedWithVoiceprint")
          : t("toasts.speakerUpdated"),
      )
    } catch (error) {
      const message =
        error instanceof FinchApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : t("toasts.speakerUpdateFailed")
      toast.error(message)
      throw error
    } finally {
      setSpeakerSavePending(false)
    }
  }

  const handleRename = async (nextTitle: string) => {
    try {
      await updateMutation.mutateAsync({ title: nextTitle })
      setTitle(nextTitle)
      queryClient.setQueryData<Recording>(["recordings", recording.id], (current) =>
        current ? { ...current, title: nextTitle } : current,
      )
      toast.success(t("toasts.recordingRenamed"))
    } catch {
      toast.error(t("toasts.recordingRenameFailed"))
      throw new Error(t("toasts.recordingRenameFailed"))
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(recording.id)
      toast.success(t("toasts.recordingDeleted"))
      void navigate({ to: "/recordings" })
    } catch {
      toast.error(t("toasts.recordingDeleteFailed"))
    }
  }

  return {
    title,
    text,
    segments,
    profiles,
    voiceprintProfilesStatus,
    speakerSavePending,
    renamePending: updateMutation.isPending,
    deletePending: deleteMutation.isPending,
    handleRename,
    handleDelete,
    applySegmentSpeaker,
  }
}
