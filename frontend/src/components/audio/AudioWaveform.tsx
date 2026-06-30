
import { useEffect, useRef } from "react"
import type { RecorderState } from "@/hooks/useAudioRecorder"

const SAMPLE_INTERVAL_MS = 50

type AudioWaveformProps = {
  state: RecorderState
  stream: MediaStream | null
  audioBlob: Blob | null
}

function getPrimaryColor(element: HTMLElement) {
  const probe = document.createElement("span")
  probe.className = "text-primary"
  probe.style.display = "none"
  element.appendChild(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color || "rgb(59, 130, 246)"
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  levels: number[],
  color: string,
) {
  ctx.clearRect(0, 0, width, height)

  if (levels.length === 0) {
    ctx.strokeStyle = color
    ctx.globalAlpha = 0.25
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()
    ctx.globalAlpha = 1
    return
  }

  const gap = 1
  const barWidth = Math.max(1, (width - gap * (levels.length - 1)) / levels.length)
  const centerY = height / 2
  const maxBarHeight = height * 0.92

  for (let i = 0; i < levels.length; i++) {
    const level = Math.min(1, Math.max(0, levels[i]))
    const barHeight = Math.max(2, level * maxBarHeight)
    const x = i * (barWidth + gap)
    const y = centerY - barHeight / 2
    const radius = Math.min(barWidth / 2, 2)

    ctx.globalAlpha = 0.35 + level * 0.65
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(x, y, barWidth, barHeight, radius)
    ctx.fill()
  }

  ctx.globalAlpha = 1
}

function downsamplePeaks(peaks: number[], targetCount: number): number[] {
  if (peaks.length === 0) return []
  if (peaks.length <= targetCount) return peaks
  const result: number[] = []
  const blockSize = peaks.length / targetCount
  for (let i = 0; i < targetCount; i++) {
    const start = Math.floor(i * blockSize)
    const end = Math.floor((i + 1) * blockSize)
    let max = 0
    for (let j = start; j < end; j++) {
      max = Math.max(max, peaks[j] ?? 0)
    }
    result.push(max)
  }
  return result
}

function peaksFromAudioBuffer(buffer: AudioBuffer, barCount: number): number[] {
  const channel = buffer.getChannelData(0)
  const blockSize = Math.max(1, Math.floor(channel.length / barCount))
  const levels: number[] = []

  for (let i = 0; i < barCount; i++) {
    let peak = 0
    const start = i * blockSize
    for (let j = 0; j < blockSize; j++) {
      peak = Math.max(peak, Math.abs(channel[start + j] ?? 0))
    }
    levels.push(peak)
  }

  const max = Math.max(...levels, 0.001)
  return levels.map((level) => level / max)
}

function measurePeak(
  analyser: AnalyserNode,
  timeData: Uint8Array<ArrayBuffer>,
) {
  analyser.getByteTimeDomainData(timeData)
  let sumSquares = 0
  let peak = 0
  for (let i = 0; i < timeData.length; i++) {
    const sample = Math.abs(timeData[i] - 128) / 128
    peak = Math.max(peak, sample)
    sumSquares += sample * sample
  }
  const rms = Math.sqrt(sumSquares / timeData.length)
  return Math.min(1, peak * 0.65 + rms * 0.85)
}

function measureFrequencyBands(
  analyser: AnalyserNode,
  freqData: Uint8Array<ArrayBuffer>,
  barCount: number,
) {
  analyser.getByteFrequencyData(freqData)
  const binSize = Math.max(1, Math.floor(freqData.length / barCount))
  const bands: number[] = []

  for (let i = 0; i < barCount; i++) {
    let sum = 0
    const start = i * binSize
    for (let j = 0; j < binSize; j++) {
      sum += freqData[start + j] ?? 0
    }
    bands.push(sum / binSize / 255)
  }

  return bands
}

function buildLiveLevels(
  peaksHistory: number[],
  frequencyBands: number[],
  barCount: number,
) {
  const amplitudeLevels = downsamplePeaks(peaksHistory, barCount)
  if (amplitudeLevels.length === 0) {
    return frequencyBands.map((band) => band * 0.35)
  }

  const latestPeak = peaksHistory.at(-1) ?? 0
  return amplitudeLevels.map((amplitude, index) => {
    const band = frequencyBands[index % frequencyBands.length] ?? 0
    const volume = Math.max(amplitude, latestPeak * 0.4)
    return Math.min(1, volume * (0.45 + band * 0.55))
  })
}

export function AudioWaveform({ state, stream, audioBlob }: AudioWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const peaksHistoryRef = useRef<number[]>([])
  const frozenLevelsRef = useRef<number[]>([])
  const lastSampleAtRef = useRef(0)
  const rafRef = useRef(0)

  useEffect(() => {
    if (state === "recording" && stream) {
      peaksHistoryRef.current = []
      frozenLevelsRef.current = []
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
    let freqData: Uint8Array<ArrayBuffer> | null = null
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
      const color = getPrimaryColor(container)
      drawWaveform(setup.ctx, setup.width, setup.height, levels, color)
    }

    const renderIdle = () => {
      renderLevels([])
    }

    const startLiveLoop = () => {
      if (!stream) return

      audioContext = new AudioContext()
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.55
      source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      freqData = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>
      timeData = new Uint8Array(analyser.fftSize) as Uint8Array<ArrayBuffer>

      const tick = (now: number) => {
        if (cancelled || !analyser || !freqData || !timeData) return

        const barCount = Math.max(
          24,
          Math.min(96, Math.floor(container.clientWidth / 4)),
        )

        if (state === "recording") {
          if (now - lastSampleAtRef.current >= SAMPLE_INTERVAL_MS) {
            peaksHistoryRef.current.push(measurePeak(analyser, timeData))
            lastSampleAtRef.current = now
          }

          const frequencyBands = measureFrequencyBands(analyser, freqData, barCount)
          frozenLevelsRef.current = buildLiveLevels(
            peaksHistoryRef.current,
            frequencyBands,
            barCount,
          )
          renderLevels(frozenLevelsRef.current)
        } else if (state === "paused") {
          renderLevels(frozenLevelsRef.current)
        }

        rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    const renderPlayback = async () => {
      if (!audioBlob) {
        renderLevels(downsamplePeaks(peaksHistoryRef.current, 48))
        return
      }

      try {
        const arrayBuffer = await audioBlob.arrayBuffer()
        if (cancelled) return

        const decodeContext = new AudioContext()
        const audioBuffer = await decodeContext.decodeAudioData(arrayBuffer)
        await decodeContext.close()
        if (cancelled) return

        const barCount = Math.max(
          24,
          Math.min(120, Math.floor(container.clientWidth / 3)),
        )
        renderLevels(peaksFromAudioBuffer(audioBuffer, barCount))
      } catch {
        if (!cancelled) {
          renderLevels(
            downsamplePeaks(peaksHistoryRef.current, 48).map((peak) =>
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
      renderIdle()
    }

    const resizeObserver = new ResizeObserver(() => {
      if (state === "stopped" && audioBlob) {
        void renderPlayback()
      } else if (state === "recording" || state === "paused") {
        renderLevels(frozenLevelsRef.current)
      } else {
        renderIdle()
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
