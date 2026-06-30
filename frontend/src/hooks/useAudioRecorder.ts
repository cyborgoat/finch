
import { useCallback, useEffect, useRef, useState } from "react"

export type RecorderState =
  | "idle"
  | "permission-requested"
  | "recording"
  | "paused"
  | "stopped"
  | "uploading"
  | "error"

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return ""
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm"
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4"
  return ""
}

export function useAudioRecorder() {
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
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop())
    }
  }, [clearTimer, revokeUrl])

  const start = useCallback(async () => {
    setError(null)
    setState("permission-requested")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
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
        stream.getTracks().forEach((t) => t.stop())
      }
      recorderRef.current = recorder
      recorder.start()
      elapsedRef.current = 0
      setDurationSeconds(0)
      setMediaStream(stream)
      startTimer()
      setState("recording")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Microphone permission denied",
      )
      setState("error")
    }
  }, [revokeUrl, startTimer])

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
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop())
    recorderRef.current = null
    revokeUrl()
    setAudioBlob(null)
    setAudioUrl(null)
    setMediaStream(null)
    setDurationSeconds(0)
    setError(null)
    setState("idle")
    elapsedRef.current = 0
  }, [clearTimer, revokeUrl])

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
