import { useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  useSpeakerMemoryStatus,
  useSpeakerProfiles,
} from "@/hooks/useSpeakerProfiles"
import {
  useDeleteTranscript,
  useUpdateTranscript,
} from "@/hooks/useTranscripts"
import { updateTranscriptSpeakers, FinchApiError } from "@/lib/api"
import {
  resolveSpeakerSegments,
  transcriptDisplayText,
  formatSpeakerTranscript,
} from "@/lib/transcriptFormat"
import type { SpeakerSegment, Transcript } from "@/lib/types"

export function useTranscriptEditor(transcript: Transcript) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const updateMutation = useUpdateTranscript(transcript.id)
  const deleteMutation = useDeleteTranscript()
  const { data: memoryStatus } = useSpeakerMemoryStatus()
  const { data: profilesData } = useSpeakerProfiles()
  const profiles = useMemo(
    () => profilesData?.items ?? [],
    [profilesData?.items],
  )

  const initialSegments = resolveSpeakerSegments(transcript)

  const [title, setTitle] = useState(transcript.title)
  const [segments, setSegments] = useState(initialSegments)
  const [text, setText] = useState(() =>
    transcriptDisplayText(
      transcript.rawText,
      transcript.editedText,
      initialSegments,
    ),
  )
  const [speakerSavePending, setSpeakerSavePending] = useState(false)

  const applySpeakerUpdate = (updatedSegments: SpeakerSegment[], rawText: string) => {
    setSegments(updatedSegments)
    const formatted = formatSpeakerTranscript(updatedSegments) || rawText
    setText(formatted)
    void queryClient.invalidateQueries({ queryKey: ["transcripts", transcript.id] })
    void queryClient.invalidateQueries({ queryKey: ["speaker-profiles"] })
  }

  const applySegmentSpeaker = async (
    clusterId: string,
    segment: SpeakerSegment,
    payload: { displayName: string; profileId?: string },
  ) => {
    setSpeakerSavePending(true)
    try {
      const enroll = Boolean(
        memoryStatus?.enabled && memoryStatus?.consentGiven,
      )
      const result = await updateTranscriptSpeakers(transcript.id, [
        {
          clusterId,
          displayName: payload.displayName,
          profileId: payload.profileId,
          enroll,
          enrollStartSec: segment.startSec,
          enrollEndSec: segment.endSec,
        },
      ])
      applySpeakerUpdate(result.speakerSegments ?? [], result.rawText)
      toast.success(
        enroll ? "Speaker saved and voiceprint updated" : "Speaker updated",
      )
    } catch (error) {
      const message =
        error instanceof FinchApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to update speaker"
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
      queryClient.setQueryData<Transcript>(["transcripts", transcript.id], (current) =>
        current ? { ...current, title: nextTitle } : current,
      )
      toast.success("Recording renamed")
    } catch {
      toast.error("Failed to rename recording")
      throw new Error("Failed to rename recording")
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(transcript.id)
      toast.success("Session deleted")
      void navigate({ to: "/files" })
    } catch {
      toast.error("Failed to delete session")
    }
  }

  return {
    title,
    text,
    segments,
    profiles,
    memoryStatus,
    speakerSavePending,
    renamePending: updateMutation.isPending,
    deletePending: deleteMutation.isPending,
    handleRename,
    handleDelete,
    applySegmentSpeaker,
  }
}
