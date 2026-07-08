
import { useEffect, useRef } from "react"
import type { RecorderState } from "@/hooks/useAudioRecorder"
import {
  barCountForWidth,
  drawBarLevels,
  downsamplePeaks,
  getPrimaryColor,
  measurePeak,
  peaksFromAudioBuffer,
  type BarWaveformSize,
  WAVEFORM_SAMPLE_INTERVAL_MS,
} from "@/components/audio/waveform-utils"
import { waveformContainerClass } from "@/lib/surfaces"
import { cn } from "@/lib/utils"

type AudioWaveformProps = {
  state: RecorderState
  stream: MediaStream | null
  audioBlob?: Blob | null
  embedded?: boolean
  size?: BarWaveformSize
  className?: string
}

function buildRecordingLevels(
  peaksHistory: number[],
  barCount: number,
  currentPeak?: number,
): number[] {
  if (peaksHistory.length === 0) {
    return currentPeak !== undefined ? [currentPeak] : []
  }

  const levels = downsamplePeaks(peaksHistory, Math.max(1, barCount - 1))
  if (currentPeak === undefined) return levels
  return [...levels, currentPeak]
}

export function AudioWaveform({
  state,
  stream,
  audioBlob = null,
  embedded = false,
  size = "default",
  className,
}: AudioWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const peaksHistoryRef = useRef<number[]>([])
  const lastSampleAtRef = useRef(0)
  const rafRef = useRef(0)
  const decodeBlobOnStop = size !== "mini"

  useEffect(() => {
    if (state === "recording" && stream) {
      peaksHistoryRef.current = []
      lastSampleAtRef.current = 0
    }
  }, [state, stream])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    let audioContext: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    let source: MediaStreamAudioSourceNode | null = null
    let timeData: Uint8Array<ArrayBuffer> | null = null
    let cancelled = false

    const setupCanvas = () => {
      const ctx = canvas.getContext("2d")
      if (!ctx) return null

      const dpr = window.devicePixelRatio || 1
      const width = container.clientWidth
      const height = container.clientHeight
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      return { ctx, width, height }
    }

    const getBarCount = () => barCountForWidth(container.clientWidth, size)

    const renderLevels = (levels: number[]) => {
      const setup = setupCanvas()
      if (!setup) return
      drawBarLevels(setup.ctx, setup.width, setup.height, levels, getPrimaryColor(container))
    }

    const startLiveLoop = () => {
      if (!stream) return

      audioContext = new AudioContext()
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.68
      source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      timeData = new Uint8Array(analyser.fftSize) as Uint8Array<ArrayBuffer>

      const tick = (now: number) => {
        if (cancelled || !analyser || !timeData) return

        const barCount = getBarCount()
        const currentPeak = measurePeak(analyser, timeData)

        if (state === "recording") {
          if (now - lastSampleAtRef.current >= WAVEFORM_SAMPLE_INTERVAL_MS) {
            peaksHistoryRef.current.push(currentPeak)
            lastSampleAtRef.current = now
          }
          renderLevels(
            buildRecordingLevels(peaksHistoryRef.current, barCount, currentPeak),
          )
        } else if (state === "paused") {
          renderLevels(buildRecordingLevels(peaksHistoryRef.current, barCount))
        }

        rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    const renderStopped = () => {
      const barCount = getBarCount()

      if (decodeBlobOnStop && audioBlob) {
        void (async () => {
          try {
            const arrayBuffer = await audioBlob.arrayBuffer()
            if (cancelled) return

            const decodeContext = new AudioContext()
            const audioBuffer = await decodeContext.decodeAudioData(arrayBuffer)
            await decodeContext.close()
            if (cancelled) return

            renderLevels(peaksFromAudioBuffer(audioBuffer, barCount))
          } catch {
            if (!cancelled) {
              renderLevels(
                buildRecordingLevels(
                  peaksHistoryRef.current,
                  barCount,
                ).map((peak) => Math.max(peak, 0.05)),
              )
            }
          }
        })()
        return
      }

      renderLevels(buildRecordingLevels(peaksHistoryRef.current, barCount))
    }

    if (state === "recording" || state === "paused") {
      startLiveLoop()
    } else if (state === "stopped") {
      renderStopped()
    } else {
      renderLevels([])
    }

    const resizeObserver = new ResizeObserver(() => {
      const barCount = getBarCount()

      if (state === "stopped" && decodeBlobOnStop && audioBlob) {
        renderStopped()
      } else if (state === "recording" && analyser && timeData) {
        const currentPeak = measurePeak(analyser, timeData)
        renderLevels(
          buildRecordingLevels(peaksHistoryRef.current, barCount, currentPeak),
        )
      } else if (state === "paused" || state === "stopped") {
        renderLevels(buildRecordingLevels(peaksHistoryRef.current, barCount))
      } else {
        renderLevels([])
      }
    })
    resizeObserver.observe(container)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      resizeObserver.disconnect()
      source?.disconnect()
      if (audioContext && audioContext.state !== "closed") {
        void audioContext.close()
      }
    }
  }, [audioBlob, decodeBlobOnStop, size, state, stream])

  return (
    <div
      ref={containerRef}
      className={cn(
        size === "mini"
          ? "h-7 w-28 overflow-hidden rounded-md bg-muted/40"
          : cn("h-24 w-full overflow-hidden rounded-lg", waveformContainerClass(embedded ? "embedded" : "card")),
        className,
      )}
      aria-hidden
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
