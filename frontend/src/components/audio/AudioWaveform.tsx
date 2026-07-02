
import { useEffect, useRef } from "react"
import type { RecorderState } from "@/hooks/useAudioRecorder"
import {
  drawOscilloscopeWaveform,
  drawWaveform,
  downsamplePeaks,
  getPrimaryColor,
  measurePeak,
  peaksFromAudioBuffer,
  WAVEFORM_SAMPLE_INTERVAL_MS,
} from "@/components/audio/waveform-utils"

type AudioWaveformProps = {
  state: RecorderState
  stream: MediaStream | null
  audioBlob: Blob | null
}

export function AudioWaveform({ state, stream, audioBlob }: AudioWaveformProps) {
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
          renderLevels(downsamplePeaks(peaksHistoryRef.current, 120))
        }

        rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    const renderPlayback = async () => {
      if (!audioBlob) {
        renderLevels(downsamplePeaks(peaksHistoryRef.current, 120))
        return
      }

      try {
        const arrayBuffer = await audioBlob.arrayBuffer()
        if (cancelled) return

        const decodeContext = new AudioContext()
        const audioBuffer = await decodeContext.decodeAudioData(arrayBuffer)
        await decodeContext.close()
        if (cancelled) return

        const pointCount = Math.max(96, Math.min(240, Math.floor(container.clientWidth * 1.25)))
        renderLevels(peaksFromAudioBuffer(audioBuffer, pointCount))
      } catch {
        if (!cancelled) {
          renderLevels(
            downsamplePeaks(peaksHistoryRef.current, 120).map((peak) =>
              Math.max(peak, 0.05),
            ),
          )
        }
      }
    }

    if (state === "recording" || state === "paused") {
      startLiveLoop()
    } else if (state === "stopped") {
      void renderPlayback()
    } else {
      renderLevels([])
    }

    const resizeObserver = new ResizeObserver(() => {
      if (state === "stopped" && audioBlob) {
        void renderPlayback()
      } else if (state === "recording") {
        renderOscilloscope()
      } else if (state === "paused") {
        renderLevels(downsamplePeaks(peaksHistoryRef.current, 120))
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
  }, [state, stream, audioBlob])

  return (
    <div
      ref={containerRef}
      className="h-24 w-full overflow-hidden rounded-lg border border-border bg-muted/30"
      aria-hidden
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
