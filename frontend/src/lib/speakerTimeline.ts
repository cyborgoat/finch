import type { SpeakerSegment } from "@/lib/types"

export const SPEAKER_BAR_COLORS = [
  "bg-sky-500/80",
  "bg-emerald-500/80",
  "bg-amber-500/80",
  "bg-violet-500/80",
  "bg-rose-500/80",
  "bg-cyan-500/80",
  "bg-orange-500/80",
  "bg-indigo-500/80",
] as const

export type SegmentFragmentPosition = {
  leftPercent: number
  widthPercent: number
}

export function resolveTimelineDuration(
  segments: SpeakerSegment[],
  playbackDuration: number,
  assetDuration?: number | null,
): number {
  const fromPlayback = Number.isFinite(playbackDuration) && playbackDuration > 0
    ? playbackDuration
    : 0
  const fromAsset = Number.isFinite(assetDuration) && assetDuration && assetDuration > 0
    ? assetDuration
    : 0
  const fromSegments = segments.reduce(
    (max, segment) => Math.max(max, segment.endSec, segment.startSec),
    0,
  )

  return Math.max(fromPlayback, fromAsset, fromSegments)
}

export function segmentFragmentPosition(
  startSec: number,
  endSec: number,
  totalDuration: number,
): SegmentFragmentPosition {
  if (totalDuration <= 0) {
    return { leftPercent: 0, widthPercent: 0 }
  }

  const leftPercent = Math.max(0, Math.min(100, (startSec / totalDuration) * 100))
  const rawWidth = Math.max(0, ((endSec - startSec) / totalDuration) * 100)
  const widthPercent = Math.max(rawWidth, 0.8)

  return {
    leftPercent,
    widthPercent: Math.min(widthPercent, 100 - leftPercent),
  }
}

export function speakerBarColor(index: number): string {
  return SPEAKER_BAR_COLORS[index % SPEAKER_BAR_COLORS.length]
}

export function playbackMarkerPercent(
  currentTime: number,
  totalDuration: number,
): number | null {
  if (totalDuration <= 0 || currentTime < 0) return null
  return Math.max(0, Math.min(100, (currentTime / totalDuration) * 100))
}
