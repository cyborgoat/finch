import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  useAudioRecorder,
  type RecorderState,
} from "@/hooks/useAudioRecorder"
import { useAudioUpload } from "@/hooks/useAudioUpload"
import { useCreateRecording, useInvalidateRecordings } from "@/hooks/useRecordings"

type RecordingSessionContextValue = {
  state: RecorderState
  durationSeconds: number
  mediaStream: MediaStream | null
  audioBlob: Blob | null
  audioUrl: string | null
  error: string | null
  includeSystemAudio: boolean
  setIncludeSystemAudio: (value: boolean) => void
  isSaving: boolean
  recordDialogOpen: boolean
  start: () => Promise<void>
  pause: () => void
  resume: () => void
  stop: () => void
  reset: () => void
  saveRecording: () => Promise<string | null>
  dismissError: () => void
  openRecordDialog: () => void
  closeRecordDialog: () => void
}

const RecordingSessionContext = createContext<RecordingSessionContextValue | null>(
  null,
)

export function RecordingSessionProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const invalidateRecordings = useInvalidateRecordings()
  const createRecordingMutation = useCreateRecording()
  const { upload, isUploading } = useAudioUpload()
  const [includeSystemAudio, setIncludeSystemAudio] = useState(false)
  const [recordDialogOpen, setRecordDialogOpen] = useState(false)
  const [dismissedError, setDismissedError] = useState(false)
  const backgroundNotifiedRef = useRef(false)

  const recorderErrors = useMemo(
    () => ({
      micDenied: t("record.errors.micDenied"),
      displayDenied: t("record.errors.displayDenied"),
      noSystemAudio: t("record.errors.noSystemAudio"),
    }),
    [t],
  )

  const recorder = useAudioRecorder({
    includeSystemAudio,
    errors: recorderErrors,
  })

  const closeRecordDialog = useCallback(() => {
    if (
      (recorder.state === "recording" || recorder.state === "paused") &&
      !backgroundNotifiedRef.current
    ) {
      backgroundNotifiedRef.current = true
      toast.message(t("record.continuesInBackground"))
    }
    setRecordDialogOpen(false)
  }, [recorder.state, t])

  const openRecordDialog = useCallback(() => {
    setIncludeSystemAudio(false)
    setRecordDialogOpen(true)
  }, [])

  const start = useCallback(async () => {
    setDismissedError(false)
    backgroundNotifiedRef.current = false
    await recorder.start()
  }, [recorder])

  const reset = useCallback(() => {
    recorder.reset()
    setIncludeSystemAudio(false)
    backgroundNotifiedRef.current = false
    setDismissedError(false)
  }, [recorder])

  const saveRecording = useCallback(async () => {
    if (!recorder.audioBlob) return null
    try {
      const file = new File([recorder.audioBlob], "recording.webm", {
        type: (recorder.audioBlob.type || "audio/webm").split(";", 1)[0],
      })
      const asset = await upload(file, "recording")
      const created = await createRecordingMutation.mutateAsync({
        audioAssetId: asset.id,
      })
      invalidateRecordings()
      toast.success(t("toasts.recordingSaved"))
      reset()
      setRecordDialogOpen(false)
      backgroundNotifiedRef.current = false
      return created.recordingId
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toasts.failedToSaveRecording"))
      return null
    }
  }, [
    createRecordingMutation,
    invalidateRecordings,
    recorder.audioBlob,
    reset,
    t,
    upload,
  ])

  const value = useMemo<RecordingSessionContextValue>(
    () => ({
      state: recorder.state,
      durationSeconds: recorder.durationSeconds,
      mediaStream: recorder.mediaStream,
      audioBlob: recorder.audioBlob,
      audioUrl: recorder.audioUrl,
      error: dismissedError ? null : recorder.error,
      includeSystemAudio,
      setIncludeSystemAudio,
      isSaving: isUploading || createRecordingMutation.isPending,
      recordDialogOpen,
      start,
      pause: recorder.pause,
      resume: recorder.resume,
      stop: recorder.stop,
      reset,
      saveRecording,
      dismissError: () => setDismissedError(true),
      openRecordDialog,
      closeRecordDialog,
    }),
    [
      closeRecordDialog,
      createRecordingMutation.isPending,
      dismissedError,
      includeSystemAudio,
      isUploading,
      openRecordDialog,
      recordDialogOpen,
      recorder,
      reset,
      saveRecording,
      start,
    ],
  )

  return (
    <RecordingSessionContext.Provider value={value}>
      {children}
    </RecordingSessionContext.Provider>
  )
}

export function useRecordingSession() {
  const context = useContext(RecordingSessionContext)
  if (!context) {
    throw new Error("useRecordingSession must be used within RecordingSessionProvider")
  }
  return context
}
