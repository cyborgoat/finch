import { useNavigate } from "@tanstack/react-router"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  getDefaultTrimRange,
  isValidTrimRange,
} from "@/components/audio/TrimWaveform"
import { useEditRecordingSource } from "@/hooks/useEditRecordingSource"
import { FinchApiError } from "@/lib/api"

type UseAudioSourceEditOptions = {
  recordingId: string
  audioAssetId: string
  duration: number
  audioRef: React.RefObject<HTMLAudioElement | null>
  seek: (time: number) => void
}

export function useAudioSourceEdit({
  recordingId,
  audioAssetId,
  duration,
  audioRef,
  seek,
}: UseAudioSourceEditOptions) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const editMutation = useEditRecordingSource(recordingId, audioAssetId)

  const [isEditing, setIsEditing] = useState(false)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(duration)
  const [editCurrentTime, setEditCurrentTime] = useState(0)
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false)

  const effectiveDuration = duration > 0 ? duration : 0
  const selectedDuration = Math.max(0, trimEnd - trimStart)
  const canSubmit =
    isValidTrimRange(trimStart, trimEnd, effectiveDuration) && !editMutation.isPending

  const resetEditState = useCallback(() => {
    const defaults = getDefaultTrimRange(effectiveDuration)
    setTrimStart(defaults.trimStart)
    setTrimEnd(defaults.trimEnd)
    setEditCurrentTime(defaults.trimStart)
    setReplaceConfirmOpen(false)
  }, [effectiveDuration])

  const exitEdit = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
    }
    resetEditState()
    setIsEditing(false)
  }, [audioRef, resetEditState])

  const enterEdit = useCallback(() => {
    const defaults = getDefaultTrimRange(effectiveDuration)
    setTrimStart(defaults.trimStart)
    setTrimEnd(defaults.trimEnd)
    setEditCurrentTime(defaults.trimStart)
    setReplaceConfirmOpen(false)

    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = defaults.trimStart
    }
    seek(defaults.trimStart)
    setIsEditing(true)
  }, [audioRef, effectiveDuration, seek])

  const clampToTrimRange = useCallback(
    (time: number) => {
      if (effectiveDuration <= 0) return 0
      return Math.max(trimStart, Math.min(time, trimEnd))
    },
    [effectiveDuration, trimEnd, trimStart],
  )

  const handleEditSeek = useCallback(
    (time: number) => {
      const clamped = clampToTrimRange(time)
      seek(clamped)
      setEditCurrentTime(clamped)
    },
    [clampToTrimRange, seek],
  )

  const handleTrimChange = useCallback(
    ({ trimStart: nextStart, trimEnd: nextEnd }: { trimStart: number; trimEnd: number }) => {
      setTrimStart(nextStart)
      setTrimEnd(nextEnd)
      handleEditSeek(Math.max(nextStart, Math.min(editCurrentTime, nextEnd)))
    },
    [editCurrentTime, handleEditSeek],
  )

  const handleEditTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (audio.currentTime >= trimEnd) {
      audio.pause()
      audio.currentTime = trimEnd
      setEditCurrentTime(trimEnd)
      return
    }

    if (audio.currentTime < trimStart) {
      audio.currentTime = trimStart
    }
    setEditCurrentTime(audio.currentTime)
  }, [audioRef, trimEnd, trimStart])

  const toggleEditPlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio || effectiveDuration <= 0) return

    if (audio.paused) {
      if (audio.currentTime < trimStart || audio.currentTime >= trimEnd) {
        audio.currentTime = trimStart
        setEditCurrentTime(trimStart)
        seek(trimStart)
      }
      void audio.play().catch(() => undefined)
    } else {
      audio.pause()
    }
  }, [audioRef, effectiveDuration, seek, trimEnd, trimStart])

  const submitEdit = useCallback(
    async (mode: "replace" | "save_as_new") => {
      try {
        const result = await editMutation.mutateAsync({
          trimStartSec: trimStart,
          trimEndSec: trimEnd,
          mode,
        })

        if (mode === "replace") {
          toast.success(t("audioEdit.replaceSuccess"))
          toast.message(t("audioEdit.retranscribeHint"))
          exitEdit()
          return
        }

        toast.success(t("audioEdit.saveAsNewSuccess"))
        exitEdit()
        void navigate({
          to: "/recordings/$id",
          params: { id: result.recordingId },
        })
      } catch (error) {
        const message =
          error instanceof FinchApiError
            ? error.message
            : t("audioEdit.errorGeneric")
        toast.error(message)
      }
    },
    [editMutation, exitEdit, navigate, t, trimEnd, trimStart],
  )

  const requestReplace = useCallback(() => {
    setReplaceConfirmOpen(true)
  }, [])

  const confirmReplace = useCallback(() => {
    setReplaceConfirmOpen(false)
    void submitEdit("replace")
  }, [submitEdit])

  const saveAsNew = useCallback(() => {
    void submitEdit("save_as_new")
  }, [submitEdit])

  return {
    isEditing,
    enterEdit,
    exitEdit,
    trimStart,
    trimEnd,
    editCurrentTime,
    selectedDuration,
    handleTrimChange,
    handleEditSeek,
    handleEditTimeUpdate,
    toggleEditPlay,
    saveAsNew,
    requestReplace,
    confirmReplace,
    replaceConfirmOpen,
    setReplaceConfirmOpen,
    isPending: editMutation.isPending,
    canSubmit,
  }
}
