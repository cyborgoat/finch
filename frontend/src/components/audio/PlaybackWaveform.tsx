import { useCallback, useEffect, useRef, useState } from "react"
import { WaveformSkeleton } from "@/components/audio/WaveformSkeleton"
import {
  barCountForWidth,
  drawBarLevelsWithProgress,
  getMutedForegroundColor,
  getPrimaryColor,
  peaksFromAudioBuffer,
} from "@/components/audio/waveform-utils"
import { waveformContainerClass } from "@/lib/surfaces"
import { cn } from "@/lib/utils"

type PlaybackWaveformProps = {
  src: string
  audioRef?: React.RefObject<HTMLAudioElement | null>
  isPlaying?: boolean
  currentTime: number
  duration: number
  disabled?: boolean
  embedded?: boolean
  onSeek: (time: number) => void
  className?: string
  "aria-label"?: string
}

type LoadedWaveform = {
  src: string
  peaks: number[]
}

const EMPTY_PEAKS: number[] = []

function clampTime(value: number, max: number) {
  if (!Number.isFinite(value) || value < 0) return 0
  if (max <= 0) return 0
  return Math.min(value, max)
}

export function PlaybackWaveform({
  src,
  audioRef,
  isPlaying = false,
  currentTime,
  duration,
  disabled = false,
  embedded = false,
  onSeek,
  className,
  "aria-label": ariaLabel,
}: PlaybackWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDraggingRef = useRef(false)
  const rafRef = useRef(0)
  const [loadedWaveform, setLoadedWaveform] = useState<LoadedWaveform | null>(null)

  const peaks = loadedWaveform?.src === src ? loadedWaveform.peaks : EMPTY_PEAKS
  const isLoading = Boolean(src) && loadedWaveform?.src !== src

  const renderWaveformAt = useCallback(
    (time: number) => {
      const container = containerRef.current
      const canvas = canvasRef.current
      if (!container || !canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      const width = container.clientWidth
      const height = container.clientHeight
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const progress = duration > 0 ? clampTime(time, duration) / duration : 0
      drawBarLevelsWithProgress(
        ctx,
        width,
        height,
        peaks,
        progress,
        getPrimaryColor(container),
        getMutedForegroundColor(container),
      )
    },
    [duration, peaks],
  )

  const renderWaveform = useCallback(() => {
    renderWaveformAt(currentTime)
  }, [currentTime, renderWaveformAt])

  useEffect(() => {
    let cancelled = false

    if (!src) {
      return () => {
        cancelled = true
      }
    }

    const loadWaveform = async () => {
      try {
        const response = await fetch(src)
        if (!response.ok) throw new Error("Failed to load audio")

        const arrayBuffer = await response.arrayBuffer()
        if (cancelled) return

        const decodeContext = new AudioContext()
        const audioBuffer = await decodeContext.decodeAudioData(arrayBuffer.slice(0))
        await decodeContext.close()
        if (cancelled) return

        const container = containerRef.current
        const pointCount = barCountForWidth(container?.clientWidth ?? 320)
        setLoadedWaveform({
          src,
          peaks: peaksFromAudioBuffer(audioBuffer, pointCount),
        })
      } catch {
        if (!cancelled) {
          setLoadedWaveform({ src, peaks: [] })
        }
      }
    }

    void loadWaveform()

    return () => {
      cancelled = true
    }
  }, [src])

  useEffect(() => {
    if (isLoading) return
    if (isPlaying && audioRef?.current) return
    renderWaveform()
  }, [renderWaveform, isPlaying, audioRef, isLoading])

  useEffect(() => {
    if (isLoading || !isPlaying || !audioRef) return

    let cancelled = false

    const tick = () => {
      if (cancelled) return

      const audio = audioRef.current
      if (!audio || audio.paused) {
        renderWaveform()
        return
      }

      renderWaveformAt(audio.currentTime)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
    }
  }, [isPlaying, audioRef, renderWaveform, renderWaveformAt, isLoading])

  useEffect(() => {
    if (isLoading) return
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(() => {
      if (isPlaying && audioRef?.current) {
        renderWaveformAt(audioRef.current.currentTime)
      } else {
        renderWaveform()
      }
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [renderWaveform, renderWaveformAt, isPlaying, audioRef, isLoading])

  const seekFromClientX = useCallback(
    (clientX: number) => {
      if (disabled || duration <= 0) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect || rect.width <= 0) return

      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      onSeek(ratio * duration)
    },
    [disabled, duration, onSeek],
  )

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return
    isDraggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    seekFromClientX(event.clientX)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    seekFromClientX(event.clientX)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return

    const step = event.shiftKey ? 10 : 5
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      onSeek(clampTime(currentTime - step, duration))
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      onSeek(clampTime(currentTime + step, duration))
    } else if (event.key === "Home") {
      event.preventDefault()
      onSeek(0)
    } else if (event.key === "End") {
      event.preventDefault()
      onSeek(duration)
    }
  }

  if (isLoading) {
    return <WaveformSkeleton ref={containerRef} embedded={embedded} className={className} />
  }

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={clampTime(currentTime, duration)}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative w-full overflow-hidden rounded-lg",
        embedded ? "h-14" : "h-20",
        embedded ? waveformContainerClass("embedded") : waveformContainerClass("card"),
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer touch-none",
        className,
      )}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
