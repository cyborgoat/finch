import { useCallback, useEffect, useRef, useState } from "react"
import { getAudioStreamUrl, PLAYBACK_SKIP_SECONDS, type PlaybackRate } from "@/lib/audio"

function finiteDuration(value: number | undefined | null): number {
  if (value == null || !Number.isFinite(value) || value <= 0) return 0
  return value
}

type PlaybackState = {
  src: string
  isPlaying: boolean
  currentTime: number
  duration: number
  isReady: boolean
}

export function useRecordingPlayback(
  audioAssetId: string,
  knownDurationSeconds?: number | null,
) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const src = audioAssetId ? getAudioStreamUrl(audioAssetId) : ""
  const knownDuration = finiteDuration(knownDurationSeconds)

  const [playback, setPlayback] = useState<PlaybackState>(() => ({
    src,
    isPlaying: false,
    currentTime: 0,
    duration: knownDuration,
    isReady: knownDuration > 0,
  }))
  const [playbackRate, setPlaybackRateState] = useState<PlaybackRate>(1)

  if (src !== playback.src) {
    setPlayback({
      src,
      isPlaying: false,
      currentTime: 0,
      duration: knownDuration,
      isReady: knownDuration > 0,
    })
  } else if (knownDuration > 0 && playback.duration === 0) {
    setPlayback((prev) => ({
      ...prev,
      duration: knownDuration,
      isReady: true,
    }))
  }

  const { isPlaying, currentTime, duration, isReady } = playback

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
      setPlayback((prev) => ({ ...prev, duration: fromElement, isReady: true }))
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
      setPlayback((prev) => ({ ...prev, currentTime: clamped }))
    },
    [maxDuration],
  )

  const seekAndPlay = useCallback(
    (time: number) => {
      seek(time)
      const audio = audioRef.current
      if (!audio) return
      void audio.play().catch(() => {
        setPlayback((prev) => ({ ...prev, isPlaying: false }))
      })
    },
    [seek],
  )

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      void audio.play().catch(() => {
        setPlayback((prev) => ({ ...prev, isPlaying: false }))
      })
    } else {
      audio.pause()
    }
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    setPlayback((prev) => ({ ...prev, currentTime: audio.currentTime }))
  }, [])

  const markReady = useCallback(() => {
    syncDurationFromElement()
    setPlayback((prev) => ({ ...prev, isReady: true }))
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
    setPlayback((prev) => ({ ...prev, isPlaying: true }))
    markReady()
  }, [markReady])

  const handlePause = useCallback(() => {
    setPlayback((prev) => ({ ...prev, isPlaying: false }))
  }, [])

  const handleEnded = useCallback(() => {
    setPlayback((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }))
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
