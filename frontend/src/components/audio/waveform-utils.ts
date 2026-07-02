export function getPrimaryColor(element: HTMLElement) {
  const probe = document.createElement("span")
  probe.className = "text-primary"
  probe.style.display = "none"
  element.appendChild(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color || "rgb(59, 130, 246)"
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

export function downsamplePeaks(peaks: number[], targetCount: number): number[] {
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
  return Math.min(1, peak * 0.65 + rms * 0.85)
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
  return amplitudeLevels.map((amplitude, index) => {
    const band = frequencyBands[index % frequencyBands.length] ?? 0
    const volume = Math.max(amplitude, latestPeak * 0.4)
    return Math.min(1, volume * (0.45 + band * 0.55))
  })
}

export const WAVEFORM_SAMPLE_INTERVAL_MS = 50
