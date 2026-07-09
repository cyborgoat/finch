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

export const MIN_TRIM_SECONDS = 0.5

const HANDLE_HIT_WIDTH = 14

type TrimWaveformProps = {
  src: string
  duration: number
  trimStart: number
  trimEnd: number
  currentTime: number
  disabled?: boolean
  embedded?: boolean
  onTrimChange: (next: { trimStart: number; trimEnd: number }) => void
  onSeek: (time: number) => void
  className?: string
  startHandleAriaLabel?: string
  endHandleAriaLabel?: string
  "aria-label"?: string
}

type DragTarget = "start" | "end" | "seek" | null

function clampTime(value: number, max: number) {
  if (!Number.isFinite(value) || value < 0) return 0
  if (max <= 0) return 0
  return Math.min(value, max)
}

function clampTrimRange(
  trimStart: number,
  trimEnd: number,
  duration: number,
): { trimStart: number; trimEnd: number } {
  if (duration <= 0) {
    return { trimStart: 0, trimEnd: 0 }
  }

  let start = clampTime(trimStart, duration)
  let end = clampTime(trimEnd, duration)

  if (end - start < MIN_TRIM_SECONDS) {
    if (end + MIN_TRIM_SECONDS <= duration) {
      end = start + MIN_TRIM_SECONDS
    } else if (start - MIN_TRIM_SECONDS >= 0) {
      start = end - MIN_TRIM_SECONDS
    } else {
      start = 0
      end = duration
    }
  }

  return {
    trimStart: Math.max(0, start),
    trimEnd: Math.min(duration, end),
  }
}

function drawTrimWaveform(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  peaks: number[],
  duration: number,
  currentTime: number,
  primaryColor: string,
  mutedColor: string,
) {
  const progress = duration > 0 ? clampTime(currentTime, duration) / duration : 0
  drawBarLevelsWithProgress(
    ctx,
    width,
    height,
    peaks,
    progress,
    primaryColor,
    mutedColor,
    { mutedOpacity: 0.25, playedOpacity: 0.85 },
  )
}

export function TrimWaveform({
  src,
  duration,
  trimStart,
  trimEnd,
  currentTime,
  disabled = false,
  embedded = false,
  onTrimChange,
  onSeek,
  className,
  startHandleAriaLabel,
  endHandleAriaLabel,
  "aria-label": ariaLabel,
}: TrimWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragTargetRef = useRef<DragTarget>(null)
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

  const renderWaveform = useCallback(() => {
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

    drawTrimWaveform(
      ctx,
      width,
      height,
      peaks,
      duration,
      currentTime,
      getPrimaryColor(container),
      getMutedForegroundColor(container),
    )
  }, [currentTime, duration, peaks])

  useEffect(() => {
    if (isLoading) return
    renderWaveform()
  }, [renderWaveform, isLoading])

  useEffect(() => {
    if (isLoading) return
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(() => {
      renderWaveform()
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [renderWaveform, isLoading])

  const timeFromClientX = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect || rect.width <= 0 || duration <= 0) return 0
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      return ratio * duration
    },
    [duration],
  )

  const resolveDragTarget = useCallback(
    (clientX: number): DragTarget => {
      if (disabled || duration <= 0) return null
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect || rect.width <= 0) return null

      const startX = (trimStart / duration) * rect.width + rect.left
      const endX = (trimEnd / duration) * rect.width + rect.left

      if (Math.abs(clientX - startX) <= HANDLE_HIT_WIDTH) return "start"
      if (Math.abs(clientX - endX) <= HANDLE_HIT_WIDTH) return "end"
      return "seek"
    },
    [disabled, duration, trimEnd, trimStart],
  )

  const updateTrim = useCallback(
    (target: "start" | "end", time: number) => {
      if (target === "start") {
        onTrimChange(clampTrimRange(time, trimEnd, duration))
      } else {
        onTrimChange(clampTrimRange(trimStart, time, duration))
      }
    },
    [duration, onTrimChange, trimEnd, trimStart],
  )

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return
    const target = resolveDragTarget(event.clientX)
    dragTargetRef.current = target
    event.currentTarget.setPointerCapture(event.pointerId)

    if (target === "seek") {
      onSeek(clampTime(timeFromClientX(event.clientX), duration))
    } else if (target) {
      updateTrim(target, timeFromClientX(event.clientX))
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = dragTargetRef.current
    if (!target) return

    const time = timeFromClientX(event.clientX)
    if (target === "seek") {
      onSeek(clampTime(time, duration))
    } else {
      updateTrim(target, time)
    }
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragTargetRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
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

  const startPercent = duration > 0 ? (trimStart / duration) * 100 : 0
  const endPercent = duration > 0 ? (trimEnd / duration) * 100 : 100
  const selectionWidthPercent = Math.max(0, endPercent - startPercent)

  return (
    <div className={cn("relative h-full w-full", className)}>
      <div
        ref={containerRef}
        role="group"
        aria-label={ariaLabel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          "relative h-full min-h-0 w-full overflow-hidden rounded-lg",
          embedded ? waveformContainerClass("embedded") : waveformContainerClass("card"),
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer touch-none",
        )}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />

        {duration > 0 ? (
          <div
            className="pointer-events-none absolute inset-y-0 rounded-lg border-2 border-primary bg-transparent ring-1 ring-primary/20"
            style={{
              left: `${startPercent}%`,
              width: `${selectionWidthPercent}%`,
            }}
          >
            <div className="absolute inset-y-1.5 left-0 w-1.5 -translate-x-1/2 rounded-full bg-primary" />
            <div className="absolute inset-y-1.5 right-0 w-1.5 translate-x-1/2 rounded-full bg-primary" />
          </div>
        ) : null}
      </div>
      <button
        type="button"
        tabIndex={-1}
        aria-label={startHandleAriaLabel}
        disabled={disabled}
        className="pointer-events-none absolute top-0 h-full w-0 -translate-x-1/2 border-0 bg-transparent p-0"
        style={{ left: `${startPercent}%` }}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={endHandleAriaLabel}
        disabled={disabled}
        className="pointer-events-none absolute top-0 h-full w-0 -translate-x-1/2 border-0 bg-transparent p-0"
        style={{ left: `${endPercent}%` }}
      />
    </div>
  )
}

export function getDefaultTrimRange(duration: number) {
  return {
    trimStart: 0,
    trimEnd: duration > 0 ? duration : 0,
  }
}

export function isValidTrimRange(trimStart: number, trimEnd: number, duration: number) {
  if (duration <= 0) return false
  return trimEnd - trimStart >= MIN_TRIM_SECONDS && trimEnd <= duration + 0.01
}
