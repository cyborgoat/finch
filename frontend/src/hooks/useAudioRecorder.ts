
import { useCallback, useEffect, useRef, useState } from "react"

export type RecorderState =
  | "idle"
  | "permission-requested"
  | "recording"
  | "paused"
  | "stopped"
  | "uploading"
  | "error"

export type UseAudioRecorderOptions = {
  includeSystemAudio?: boolean
  errors?: {
    micDenied?: string
    displayDenied?: string
    noSystemAudio?: string
  }
}

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return ""
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm"
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4"
  return ""
}

async function createCaptureStream(
  includeSystemAudio: boolean,
  errors: UseAudioRecorderOptions["errors"],
): Promise<{ stream: MediaStream; cleanup: () => void }> {
  const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })

  if (!includeSystemAudio) {
    return {
      stream: micStream,
      cleanup: () => micStream.getTracks().forEach((track) => track.stop()),
    }
  }

  let displayStream: MediaStream
  try {
    displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    })
  } catch (err) {
    micStream.getTracks().forEach((track) => track.stop())
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      throw new Error(
        errors?.displayDenied ?? "Screen or tab sharing was cancelled",
        { cause: err },
      )
    }
    throw err
  }

  if (displayStream.getAudioTracks().length === 0) {
    displayStream.getTracks().forEach((track) => track.stop())
    micStream.getTracks().forEach((track) => track.stop())
    throw new Error(
      errors?.noSystemAudio ??
        "No computer audio was shared. Choose a tab or window and enable audio sharing.",
    )
  }

  const audioContext = new AudioContext()
  const destination = audioContext.createMediaStreamDestination()
  audioContext.createMediaStreamSource(micStream).connect(destination)
  audioContext
    .createMediaStreamSource(
      new MediaStream(displayStream.getAudioTracks()),
    )
    .connect(destination)

  const cleanup = () => {
    micStream.getTracks().forEach((track) => track.stop())
    displayStream.getTracks().forEach((track) => track.stop())
    void audioContext.close()
  }

  return { stream: destination.stream, cleanup }
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
  const { includeSystemAudio = false, errors } = options

  const [state, setState] = useState<RecorderState>("idle")
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(0)
  const elapsedRef = useRef(0)
  const audioUrlRef = useRef<string | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const revokeUrl = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
  }, [])

  const stopCapture = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop())
  }, [])

  const startTimer = useCallback(() => {
    startedAtRef.current = Date.now()
    clearTimer()
    timerRef.current = window.setInterval(() => {
      setDurationSeconds(
        elapsedRef.current + (Date.now() - startedAtRef.current) / 1000,
      )
    }, 200)
  }, [clearTimer])

  useEffect(() => {
    return () => {
      clearTimer()
      revokeUrl()
      stopCapture()
    }
  }, [clearTimer, revokeUrl, stopCapture])

  const start = useCallback(async () => {
    setError(null)
    setState("permission-requested")
    try {
      const { stream, cleanup } = await createCaptureStream(
        includeSystemAudio,
        errors,
      )
      cleanupRef.current = cleanup

      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      )
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        })
        revokeUrl()
        const url = URL.createObjectURL(blob)
        audioUrlRef.current = url
        setAudioBlob(blob)
        setAudioUrl(url)
        setState("stopped")
        setMediaStream(null)
        stopCapture()
      }
      recorderRef.current = recorder
      recorder.start()
      elapsedRef.current = 0
      setDurationSeconds(0)
      setMediaStream(stream)
      startTimer()
      setState("recording")
    } catch (err) {
      stopCapture()
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError(errors?.micDenied ?? "Microphone permission denied")
      } else {
        setError(
          err instanceof Error
            ? err.message
            : (errors?.micDenied ?? "Microphone permission denied"),
        )
      }
      setState("error")
    }
  }, [errors, includeSystemAudio, revokeUrl, startTimer, stopCapture])

  const pause = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== "recording") return
    recorder.pause()
    clearTimer()
    elapsedRef.current += (Date.now() - startedAtRef.current) / 1000
    setState("paused")
  }, [clearTimer])

  const resume = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== "paused") return
    recorder.resume()
    startTimer()
    setState("recording")
  }, [startTimer])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === "inactive") return
    clearTimer()
    elapsedRef.current += (Date.now() - startedAtRef.current) / 1000
    setDurationSeconds(elapsedRef.current)
    recorder.stop()
  }, [clearTimer])

  const reset = useCallback(() => {
    clearTimer()
    stopCapture()
    recorderRef.current = null
    revokeUrl()
    setAudioBlob(null)
    setAudioUrl(null)
    setMediaStream(null)
    setDurationSeconds(0)
    setError(null)
    setState("idle")
    elapsedRef.current = 0
  }, [clearTimer, revokeUrl, stopCapture])

  return {
    state,
    durationSeconds,
    audioBlob,
    audioUrl,
    mediaStream,
    error,
    start,
    pause,
    resume,
    stop,
    reset,
  }
}
