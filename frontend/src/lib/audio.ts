import { getApiBaseUrl } from "@/lib/api-base"

export const PLAYBACK_SKIP_SECONDS = 15

export const PLAYBACK_RATES = [0.5, 1, 2, 5] as const

export type PlaybackRate = (typeof PLAYBACK_RATES)[number]

export function formatPlaybackRate(rate: PlaybackRate): string {
  return rate === 1 ? "1×" : `${rate}×`
}

export function getAudioStreamUrl(audioAssetId: string): string {
  return `${getApiBaseUrl()}/api/audio/${audioAssetId}/stream`
}

export function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function findActiveSegmentIndex(
  segments: { startSec: number; endSec: number }[],
  currentTime: number,
): number {
  if (segments.length === 0) return -1
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    const nextStart = segments[index + 1]?.startSec
    const end =
      segment.endSec > segment.startSec
        ? segment.endSec
        : nextStart ?? segment.startSec + 0.001
    if (currentTime >= segment.startSec && currentTime < end) {
      return index
    }
  }
  return -1
}

export function getCurrentSegmentIndex(
  segments: { startSec: number; endSec: number }[],
  currentTime: number,
): number {
  if (segments.length === 0) return -1

  const active = findActiveSegmentIndex(segments, currentTime)
  if (active >= 0) return active

  if (currentTime < segments[0].startSec) return 0

  for (let index = segments.length - 1; index >= 0; index -= 1) {
    if (currentTime >= segments[index].startSec) {
      return index
    }
  }

  return segments.length - 1
}
