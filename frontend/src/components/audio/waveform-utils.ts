function readThemeColor(element: HTMLElement, className: string, fallback: string) {
  const probe = document.createElement("span")
  probe.className = className
  probe.style.display = "none"
  element.appendChild(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color || fallback
}

export function getPrimaryColor(element: HTMLElement) {
  return readThemeColor(element, "text-primary", "rgb(59, 130, 246)")
}

export function getMutedForegroundColor(element: HTMLElement) {
  return readThemeColor(element, "text-muted-foreground", "rgb(113, 113, 122)")
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function boostLevels(levels: number[]): number[] {
  return levels.map((level) => clamp01(level * 1.6))
}

function smoothArray(values: number[], radius = 2): number[] {
  if (values.length === 0) return []
  return values.map((_, index) => {
    let sum = 0
    let count = 0
    for (let offset = -radius; offset <= radius; offset++) {
      const sample = values[index + offset]
      if (sample === undefined) continue
      sum += sample
      count++
    }
    return count > 0 ? sum / count : values[index]
  })
}

function resampleLevels(levels: number[], targetCount: number): number[] {
  if (levels.length === 0) return []
  if (levels.length === 1) return Array.from({ length: targetCount }, () => levels[0])
  if (targetCount <= 1) return [levels.at(-1) ?? 0]

  const result: number[] = []
  for (let i = 0; i < targetCount; i++) {
    const position = (i / (targetCount - 1)) * (levels.length - 1)
    const left = Math.floor(position)
    const right = Math.min(levels.length - 1, left + 1)
    const blend = position - left
    result.push(levels[left] * (1 - blend) + levels[right] * blend)
  }
  return result
}

export type BarWaveformSize = "default" | "mini"

export function barCountForWidth(width: number, size: BarWaveformSize = "default"): number {
  const slotWidth = size === "mini" ? 3.5 : 2.5
  const min = size === "mini" ? 32 : 64
  const max = size === "mini" ? 96 : 400
  return Math.max(min, Math.min(max, Math.floor(width / slotWidth)))
}

type BarLayout = {
  paddingX: number
  paddingY: number
  barWidth: number
  gap: number
  drawableHeight: number
  barCount: number
}

export function computeBarLayout(
  width: number,
  height: number,
  barCount: number,
): BarLayout {
  const paddingX = 4
  const paddingY = 6
  const gap = barCount > 1 ? 1.5 : 0
  const drawableWidth = Math.max(1, width - paddingX * 2)
  const barWidth =
    barCount > 0 ? Math.max(1.5, (drawableWidth - gap * (barCount - 1)) / barCount) : 1.5
  const drawableHeight = Math.max(1, height - paddingY * 2)

  return { paddingX, paddingY, barWidth, gap, drawableHeight, barCount }
}

type DrawBarLevelsOptions = {
  minBarHeight?: number
  maxHeightRatio?: number
  opacity?: number
  idleBarCount?: number
}

const DEFAULT_BAR_OPTIONS = {
  minBarHeight: 2,
  maxHeightRatio: 0.88,
  opacity: 0.9,
  idleBarCount: 48,
} as const

function prepareBarLevels(levels: number[], barCount: number): number[] {
  if (levels.length === 0) return []
  const resampled = resampleLevels(levels, barCount)
  return boostLevels(smoothArray(resampled, 1))
}

function drawSingleBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  bottomY: number,
  barWidth: number,
  barHeight: number,
  color: string,
  opacity: number,
) {
  const radius = Math.min(barWidth / 2, 1.5)
  ctx.fillStyle = color
  ctx.globalAlpha = opacity
  ctx.beginPath()
  ctx.roundRect(x, bottomY - barHeight, barWidth, barHeight, [radius, radius, 0, 0])
  ctx.fill()
  ctx.globalAlpha = 1
}

function drawIdleBars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
  idleBarCount: number,
) {
  const layout = computeBarLayout(width, height, idleBarCount)
  const bottomY = layout.paddingY + layout.drawableHeight
  const idleLevel = 0.08

  for (let i = 0; i < layout.barCount; i++) {
    const x = layout.paddingX + i * (layout.barWidth + layout.gap)
    const barHeight = Math.max(
      DEFAULT_BAR_OPTIONS.minBarHeight,
      idleLevel * layout.drawableHeight * DEFAULT_BAR_OPTIONS.maxHeightRatio,
    )
    drawSingleBar(ctx, x, bottomY, layout.barWidth, barHeight, color, 0.2)
  }
}

export function drawBarLevels(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  levels: number[],
  color: string,
  options: DrawBarLevelsOptions = {},
) {
  const { minBarHeight, maxHeightRatio, opacity, idleBarCount } = {
    ...DEFAULT_BAR_OPTIONS,
    ...options,
  }

  ctx.clearRect(0, 0, width, height)

  const barCount = levels.length > 0 ? levels.length : idleBarCount
  const layout = computeBarLayout(width, height, barCount)
  const bottomY = layout.paddingY + layout.drawableHeight
  const maxBarHeight = layout.drawableHeight * maxHeightRatio

  if (levels.length === 0) {
    drawIdleBars(ctx, width, height, color, idleBarCount)
    return
  }

  const smoothed = prepareBarLevels(levels, layout.barCount)

  for (let i = 0; i < smoothed.length; i++) {
    const level = clamp01(smoothed[i] ?? 0)
    const barHeight = Math.max(minBarHeight, level * maxBarHeight)
    const x = layout.paddingX + i * (layout.barWidth + layout.gap)
    drawSingleBar(ctx, x, bottomY, layout.barWidth, barHeight, color, opacity)
  }
}

type DrawBarLevelsWithProgressOptions = DrawBarLevelsOptions & {
  showPlayhead?: boolean
  playedOpacity?: number
  mutedOpacity?: number
}

export function drawBarLevelsWithProgress(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  levels: number[],
  progress: number,
  color: string,
  mutedColor: string,
  options: DrawBarLevelsWithProgressOptions = {},
) {
  const {
    minBarHeight,
    maxHeightRatio,
    idleBarCount,
    showPlayhead = true,
    playedOpacity = 0.9,
    mutedOpacity = 0.35,
  } = {
    ...DEFAULT_BAR_OPTIONS,
    ...options,
  }

  ctx.clearRect(0, 0, width, height)

  const progressX = clamp01(progress) * width
  const barCount = levels.length > 0 ? levels.length : idleBarCount
  const layout = computeBarLayout(width, height, barCount)
  const bottomY = layout.paddingY + layout.drawableHeight
  const maxBarHeight = layout.drawableHeight * maxHeightRatio

  if (levels.length === 0) {
    drawIdleBars(ctx, width, height, mutedColor, idleBarCount)
    return
  }

  const smoothed = prepareBarLevels(levels, layout.barCount)

  for (let i = 0; i < smoothed.length; i++) {
    const level = clamp01(smoothed[i] ?? 0)
    const barHeight = Math.max(minBarHeight, level * maxBarHeight)
    const x = layout.paddingX + i * (layout.barWidth + layout.gap)
    const barCenterX = x + layout.barWidth / 2
    const isPlayed = barCenterX <= progressX
    drawSingleBar(
      ctx,
      x,
      bottomY,
      layout.barWidth,
      barHeight,
      isPlayed ? color : mutedColor,
      isPlayed ? playedOpacity : mutedOpacity,
    )
  }

  if (showPlayhead && progressX > 0 && progressX < width) {
    ctx.strokeStyle = color
    ctx.globalAlpha = 0.55
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(progressX, layout.paddingY)
    ctx.lineTo(progressX, bottomY)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
}

export function downsamplePeaks(peaks: number[], targetCount: number): number[] {
  if (peaks.length === 0) return []
  if (peaks.length <= targetCount) return smoothArray(peaks, 1)
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
  return smoothArray(result, 1)
}

export function peaksFromAudioBuffer(buffer: AudioBuffer, pointCount: number): number[] {
  const channel = buffer.getChannelData(0)
  const blockSize = Math.max(1, Math.floor(channel.length / pointCount))
  const levels: number[] = []

  for (let i = 0; i < pointCount; i++) {
    let peak = 0
    const start = i * blockSize
    for (let j = 0; j < blockSize; j++) {
      peak = Math.max(peak, Math.abs(channel[start + j] ?? 0))
    }
    levels.push(peak)
  }

  const max = Math.max(...levels, 0.001)
  return smoothArray(levels.map((level) => level / max), 2)
}

export function measurePeak(
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
  return Math.min(1, peak * 0.85 + rms * 1.15)
}

export function measureFrequencyBands(
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

export function buildLiveLevels(
  peaksHistory: number[],
  frequencyBands: number[],
  barCount: number,
) {
  const amplitudeLevels = downsamplePeaks(peaksHistory, barCount)
  if (amplitudeLevels.length === 0) {
    return frequencyBands.map((band) => band * 0.35)
  }

  const latestPeak = peaksHistory.at(-1) ?? 0
  return smoothArray(
    amplitudeLevels.map((amplitude, index) => {
      const band = frequencyBands[index % frequencyBands.length] ?? 0
      const volume = Math.max(amplitude, latestPeak * 0.4)
      return Math.min(1, volume * (0.45 + band * 0.55))
    }),
    2,
  )
}

export const WAVEFORM_SAMPLE_INTERVAL_MS = 50
