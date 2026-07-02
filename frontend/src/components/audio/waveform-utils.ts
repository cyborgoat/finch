export function getPrimaryColor(element: HTMLElement) {
  const probe = document.createElement("span")
  probe.className = "text-primary"
  probe.style.display = "none"
  element.appendChild(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color || "rgb(59, 130, 246)"
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

/** Boost quiet mic signals so the wave uses more of the canvas height. */
function amplifyOscilloscopeSamples(samples: number[]): number[] {
  if (samples.length === 0) return []

  const peak = Math.max(...samples.map((sample) => Math.abs(sample)), 0.03)
  const gain = Math.min(5, 0.88 / peak)

  return samples.map((sample) => Math.max(-1, Math.min(1, sample * gain)))
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

function smoothSamples(values: number[]): number[] {
  return smoothArray(smoothArray(values, 4), 2)
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

function drawSmoothCurve(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  tension = 0.42,
) {
  if (points.length === 0) return
  if (points.length === 1) {
    ctx.lineTo(points[0].x, points[0].y)
    return
  }

  ctx.moveTo(points[0].x, points[0].y)

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
  }
}

function drawIdleLine(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
) {
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.25
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, height / 2)
  ctx.lineTo(width, height / 2)
  ctx.stroke()
  ctx.globalAlpha = 1
}

export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  levels: number[],
  color: string,
) {
  ctx.clearRect(0, 0, width, height)

  if (levels.length === 0) {
    drawIdleLine(ctx, width, height, color)
    return
  }

  const pointCount = Math.max(40, Math.floor(width * 0.9))
  const smoothed = boostLevels(
    smoothArray(resampleLevels(levels, pointCount), 3),
  )
  const centerY = height / 2
  const amplitude = height * 0.48

  const topPoints = smoothed.map((level, index) => ({
    x: (index / (smoothed.length - 1)) * width,
    y: centerY - clamp01(level) * amplitude,
  }))

  ctx.beginPath()
  ctx.moveTo(0, centerY)
  drawSmoothCurve(ctx, topPoints)

  for (let index = topPoints.length - 1; index >= 0; index--) {
    const point = topPoints[index]
    ctx.lineTo(point.x, centerY + (centerY - point.y))
  }

  ctx.closePath()
  ctx.fillStyle = color
  ctx.globalAlpha = 0.16
  ctx.fill()

  ctx.beginPath()
  drawSmoothCurve(ctx, topPoints)
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.lineJoin = "round"
  ctx.lineCap = "round"
  ctx.globalAlpha = 0.88
  ctx.stroke()
  ctx.globalAlpha = 1
}

export function drawOscilloscopeWaveform(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeData: Uint8Array<ArrayBuffer>,
  color: string,
) {
  ctx.clearRect(0, 0, width, height)

  if (timeData.length === 0) {
    drawIdleLine(ctx, width, height, color)
    return
  }

  const centerY = height / 2
  const amplitude = height * 0.48
  const pointCount = Math.max(48, Math.floor(width * 0.85))
  const samples: number[] = []

  for (let i = 0; i < pointCount; i++) {
    const position = (i / (pointCount - 1)) * (timeData.length - 1)
    const left = Math.floor(position)
    const right = Math.min(timeData.length - 1, left + 1)
    const blend = position - left
    const value = timeData[left] * (1 - blend) + timeData[right] * blend
    samples.push((value - 128) / 128)
  }

  const smoothed = smoothArray(amplifyOscilloscopeSamples(smoothSamples(samples)), 2)
  const points = smoothed.map((sample, index) => ({
    x: (index / (smoothed.length - 1)) * width,
    y: centerY - sample * amplitude,
  }))

  ctx.beginPath()
  drawSmoothCurve(ctx, points)
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.lineJoin = "round"
  ctx.lineCap = "round"
  ctx.globalAlpha = 0.9
  ctx.stroke()

  ctx.beginPath()
  drawSmoothCurve(ctx, points)
  ctx.lineTo(width, centerY)
  ctx.lineTo(0, centerY)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.globalAlpha = 0.12
  ctx.fill()
  ctx.globalAlpha = 1
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
