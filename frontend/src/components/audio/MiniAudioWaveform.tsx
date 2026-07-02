import { useEffect, useRef } from "react"
import type { RecorderState } from "@/hooks/useAudioRecorder"
import {
  drawOscilloscopeWaveform,
  drawWaveform,
  downsamplePeaks,
  getPrimaryColor,
  measurePeak,
  WAVEFORM_SAMPLE_INTERVAL_MS,
} from "@/components/audio/waveform-utils"

type MiniAudioWaveformProps = {
  state: RecorderState
  stream: MediaStream | null
  className?: string
}

export function MiniAudioWaveform({
  state,
  stream,
  className,
}: MiniAudioWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const peaksHistoryRef = useRef<number[]>([])
  const lastSampleAtRef = useRef(0)
  const rafRef = useRef(0)

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

    const renderLevels = (levels: number[]) => {
      const setup = setupCanvas()
      if (!setup) return
      drawWaveform(setup.ctx, setup.width, setup.height, levels, getPrimaryColor(container))
    }

    const renderOscilloscope = () => {
      const setup = setupCanvas()
      if (!setup || !timeData) return
      drawOscilloscopeWaveform(
        setup.ctx,
        setup.width,
        setup.height,
        timeData,
        getPrimaryColor(container),
      )
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

        if (state === "recording") {
          if (now - lastSampleAtRef.current >= WAVEFORM_SAMPLE_INTERVAL_MS) {
            peaksHistoryRef.current.push(measurePeak(analyser, timeData))
            lastSampleAtRef.current = now
          }
          renderOscilloscope()
        } else if (state === "paused") {
          renderLevels(downsamplePeaks(peaksHistoryRef.current, 64))
        }

        rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    if (state === "recording" || state === "paused") {
      startLiveLoop()
    } else if (state === "stopped") {
      renderLevels(downsamplePeaks(peaksHistoryRef.current, 64))
    } else {
      renderLevels([])
    }

    const resizeObserver = new ResizeObserver(() => {
      if (state === "recording") {
        renderOscilloscope()
      } else if (state === "paused" || state === "stopped") {
        renderLevels(downsamplePeaks(peaksHistoryRef.current, 64))
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
  }, [state, stream])

  return (
    <div
      ref={containerRef}
      className={className ?? "h-7 w-28 overflow-hidden rounded-md bg-muted/40"}
      aria-hidden
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
