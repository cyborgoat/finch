"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getAudioStreamUrl, PLAYBACK_SKIP_SECONDS, type PlaybackRate } from "@/lib/audio"

export function useTranscriptPlayback(audioAssetId: string) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [playbackRate, setPlaybackRateState] = useState<PlaybackRate>(1)

  const src = getAudioStreamUrl(audioAssetId)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.playbackRate = playbackRate
  }, [playbackRate])

  const setPlaybackRate = useCallback((rate: PlaybackRate) => {
    setPlaybackRateState(rate)
    const audio = audioRef.current
    if (audio) {
      audio.playbackRate = rate
    }
  }, [])

  const seek = useCallback((time: number) => {
    const audio = audioRef.current
    if (!audio) return
    const clamped = Math.max(0, Math.min(time, audio.duration || time))
    audio.currentTime = clamped
    setCurrentTime(clamped)
  }, [])

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

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    setDuration(audio.duration || 0)
    setIsReady(true)
  }, [])

  const handlePlay = useCallback(() => {
    setIsPlaying(true)
  }, [])

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
    handlePlay,
    handlePause,
    handleEnded,
    handleSeekInput,
    skipBackward,
    skipForward,
  }
}
