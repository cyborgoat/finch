import { barCountForWidth, downsamplePeaks, peaksFromAudioBuffer } from "@/components/audio/waveform-utils"

const MAX_PEAK_COUNT = barCountForWidth(2000)

type PeaksCacheEntry = {
  peaks: number[]
}

const peaksCache = new Map<string, PeaksCacheEntry>()
const inflightLoads = new Map<string, Promise<PeaksCacheEntry>>()

function peaksForCount(cachedPeaks: number[], pointCount: number): number[] {
  if (cachedPeaks.length === 0) return []
  if (cachedPeaks.length === pointCount) return cachedPeaks
  if (cachedPeaks.length > pointCount) {
    return downsamplePeaks(cachedPeaks, pointCount)
  }
  return cachedPeaks
}

export function getCachedWaveformPeaks(src: string, pointCount: number): number[] | null {
  const entry = peaksCache.get(src)
  if (!entry) return null
  return peaksForCount(entry.peaks, pointCount)
}

async function loadWaveformPeaksEntry(src: string): Promise<PeaksCacheEntry> {
  const response = await fetch(src)
  if (!response.ok) {
    throw new Error("Failed to load audio")
  }

  const arrayBuffer = await response.arrayBuffer()
  const decodeContext = new AudioContext()
  try {
    const audioBuffer = await decodeContext.decodeAudioData(arrayBuffer.slice(0))
    return {
      peaks: peaksFromAudioBuffer(audioBuffer, MAX_PEAK_COUNT),
    }
  } finally {
    await decodeContext.close()
  }
}

export async function loadWaveformPeaks(
  src: string,
  pointCount: number,
): Promise<number[]> {
  const cached = peaksCache.get(src)
  if (cached) {
    return peaksForCount(cached.peaks, pointCount)
  }

  let pending = inflightLoads.get(src)
  if (!pending) {
    pending = loadWaveformPeaksEntry(src).then(
      (entry) => {
        peaksCache.set(src, entry)
        inflightLoads.delete(src)
        return entry
      },
      (error) => {
        inflightLoads.delete(src)
        throw error
      },
    )
    inflightLoads.set(src, pending)
  }

  const entry = await pending
  return peaksForCount(entry.peaks, pointCount)
}
