import { useCallback, useEffect, useRef, useState } from "react"
import { useWaveformPeaks } from "@/components/audio/useWaveformPeaks"
import { WaveformSkeleton } from "@/components/audio/WaveformSkeleton"
import {
  barCountForWidth,
  drawBarLevelsWithProgress,
  getMutedForegroundColor,
  getPrimaryColor,
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
  const [pointCount, setPointCount] = useState(() => barCountForWidth(320))

  const { peaks, isLoading } = useWaveformPeaks(src, pointCount)

  useEffect(() => {
    const container = containerRef.current
    if (!container || isLoading) return

    const updatePointCount = () => {
      setPointCount(barCountForWidth(container.clientWidth))
    }

    updatePointCount()
    const resizeObserver = new ResizeObserver(updatePointCount)
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [isLoading])

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
    return (
      <WaveformSkeleton
        ref={containerRef}
        embedded={embedded}
        className={cn("h-full w-full", className)}
      />
    )
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
        "relative h-full min-h-0 w-full overflow-hidden rounded-lg",
        embedded ? waveformContainerClass("embedded") : waveformContainerClass("card"),
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer touch-none",
        className,
      )}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
