import { useCallback, useEffect, useRef, useState } from "react"
import { getAudioStreamUrl, PLAYBACK_SKIP_SECONDS, type PlaybackRate } from "@/lib/audio"

function finiteDuration(value: number | undefined | null): number {
  if (value == null || !Number.isFinite(value) || value <= 0) return 0
  return value
}

export function useRecordingPlayback(
  audioAssetId: string,
  knownDurationSeconds?: number | null,
) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(() =>
    finiteDuration(knownDurationSeconds),
  )
  const [isReady, setIsReady] = useState(() =>
    finiteDuration(knownDurationSeconds) > 0,
  )
  const [playbackRate, setPlaybackRateState] = useState<PlaybackRate>(1)

  const src = audioAssetId ? getAudioStreamUrl(audioAssetId) : ""

  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    const fallback = finiteDuration(knownDurationSeconds)
    setDuration(fallback)
    setIsReady(fallback > 0)
  }, [src, knownDurationSeconds])

  useEffect(() => {
    const fallback = finiteDuration(knownDurationSeconds)
    if (fallback > 0) {
      setDuration((prev) => (prev > 0 ? prev : fallback))
      setIsReady(true)
    }
  }, [knownDurationSeconds])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.playbackRate = playbackRate
  }, [playbackRate, src])

  const syncDurationFromElement = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return 0
    const fromElement = finiteDuration(audio.duration)
    if (fromElement > 0) {
      setDuration(fromElement)
      setIsReady(true)
    }
    return fromElement
  }, [])

  const setPlaybackRate = useCallback((rate: PlaybackRate) => {
    setPlaybackRateState(rate)
    const audio = audioRef.current
    if (audio) {
      audio.playbackRate = rate
    }
  }, [])

  const maxDuration = useCallback(() => {
    const audio = audioRef.current
    const fromElement = finiteDuration(audio?.duration)
    if (fromElement > 0) return fromElement
    return finiteDuration(knownDurationSeconds) || duration
  }, [duration, knownDurationSeconds])

  const seek = useCallback(
    (time: number) => {
      const audio = audioRef.current
      if (!audio) return
      const max = maxDuration()
      const clamped = Math.max(0, Math.min(time, max || time))
      audio.currentTime = clamped
      setCurrentTime(clamped)
    },
    [maxDuration],
  )

  const seekAndPlay = useCallback(
    (time: number) => {
      seek(time)
      const audio = audioRef.current
      if (!audio) return
      void audio.play().catch(() => {
        setIsPlaying(false)
      })
    },
    [seek],
  )

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      void audio.play().catch(() => {
        setIsPlaying(false)
      })
    } else {
      audio.pause()
    }
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    setCurrentTime(audio.currentTime)
  }, [])

  const markReady = useCallback(() => {
    syncDurationFromElement()
    setIsReady(true)
  }, [syncDurationFromElement])

  const handleLoadedMetadata = useCallback(() => {
    markReady()
  }, [markReady])

  const handleCanPlay = useCallback(() => {
    markReady()
  }, [markReady])

  const handleDurationChange = useCallback(() => {
    syncDurationFromElement()
  }, [syncDurationFromElement])

  const handlePlay = useCallback(() => {
    setIsPlaying(true)
    markReady()
  }, [markReady])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
  }, [])

  const handleSeekInput = useCallback(
    (value: number) => {
      seek(value)
    },
    [seek],
  )

  const skipBySeconds = useCallback(
    (delta: number) => {
      const audio = audioRef.current
      if (!audio) return
      seek(audio.currentTime + delta)
    },
    [seek],
  )

  const skipBackward = useCallback(() => {
    skipBySeconds(-PLAYBACK_SKIP_SECONDS)
  }, [skipBySeconds])

  const skipForward = useCallback(() => {
    skipBySeconds(PLAYBACK_SKIP_SECONDS)
  }, [skipBySeconds])

  return {
    audioRef,
    src,
    isPlaying,
    currentTime,
    duration,
    isReady,
    playbackRate,
    setPlaybackRate,
    togglePlay,
    seek,
    seekAndPlay,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleCanPlay,
    handleDurationChange,
    handlePlay,
    handlePause,
    handleEnded,
    handleSeekInput,
    skipBackward,
    skipForward,
  }
}
