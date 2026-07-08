import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { formatPlaybackTime } from "@/lib/audio"
import { groupSegmentsByCluster } from "@/lib/transcriptFormat"
import {
  playbackMarkerPercent,
  resolveTimelineDuration,
  segmentFragmentPosition,
  speakerBarColor,
} from "@/lib/speakerTimeline"
import { resolveSpeakerDisplayName } from "@/lib/voiceprintLabels"
import { cn } from "@/lib/utils"
import type { SpeakerSegment, VoiceprintProfileSummary } from "@/lib/types"

type SpeakerTimelinePanelProps = {
  segments: SpeakerSegment[]
  profiles: VoiceprintProfileSummary[]
  currentSegmentIndex: number
  currentPlaybackTime: number
  playbackDuration: number
  assetDuration?: number | null
  onChunkSelect: (segmentIndex: number) => void
  disabled?: boolean
}

export function SpeakerTimelinePanel({
  segments,
  profiles,
  currentSegmentIndex,
  currentPlaybackTime,
  playbackDuration,
  assetDuration,
  onChunkSelect,
  disabled,
}: SpeakerTimelinePanelProps) {
  const { t } = useTranslation()

  const totalDuration = useMemo(
    () => resolveTimelineDuration(segments, playbackDuration, assetDuration),
    [assetDuration, playbackDuration, segments],
  )

  const playbackPercent = useMemo(
    () => playbackMarkerPercent(currentPlaybackTime, totalDuration),
    [currentPlaybackTime, totalDuration],
  )

  const speakerGroups = useMemo(
    () =>
      groupSegmentsByCluster(segments, (clusterId, segment) =>
        resolveSpeakerDisplayName(clusterId, {
          segment,
          profiles,
          fallback:
            segment.matchStatus === "unknown"
              ? t("recording.unknownSpeaker")
              : segment.speaker,
        }),
      ),
    [segments, profiles, t],
  )

  if (speakerGroups.length === 0) return null

  return (
    <div className="surface-card flex h-full min-h-96 w-full flex-col overflow-hidden">
      <div className="p-1.5">
        <p className="truncate text-sm font-medium text-foreground">
          {t("recording.speakersPanelTitle")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("recording.speakersTimelineDescription")}
        </p>
      </div>

      <div
        className="relative flex-1 overflow-y-auto"
        aria-label={t("recording.speakerChunksAriaLabel")}
      >
        <div className="relative p-1.5 pt-0">
          {playbackPercent !== null ? (
            <div
              className="pointer-events-none absolute inset-y-0 left-1.5 right-1.5 z-10"
              aria-hidden
            >
              <div
                className="absolute top-0 bottom-0 w-px bg-foreground/35"
                style={{ left: `${playbackPercent}%` }}
              />
            </div>
          ) : null}

          <div className="relative space-y-3">
            {speakerGroups.map((group, groupIndex) => {
              const colorClass = speakerBarColor(groupIndex)

              return (
                <div key={group.clusterId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium text-foreground">
                      {group.displayName}
                    </p>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {t("recording.speakerChunkCount", { count: group.chunks.length })}
                    </span>
                  </div>

                  <div
                    className="relative h-3 rounded-full bg-muted/80"
                    role="group"
                    aria-label={group.displayName}
                  >
                    {group.chunks.map(({ segmentIndex, segment }) => {
                      const position = segmentFragmentPosition(
                        segment.startSec,
                        segment.endSec,
                        totalDuration,
                      )
                      const isActive = segmentIndex === currentSegmentIndex

                      return (
                        <button
                          key={`${group.clusterId}-${segmentIndex}`}
                          type="button"
                          disabled={disabled || position.widthPercent <= 0}
                          aria-current={isActive ? "true" : undefined}
                          aria-label={t("recording.speakerFragmentAriaLabel", {
                            speaker: group.displayName,
                            start: formatPlaybackTime(segment.startSec),
                            end: formatPlaybackTime(segment.endSec),
                          })}
                          title={segment.text.trim()}
                          onClick={() => onChunkSelect(segmentIndex)}
                          className={cn(
                            "absolute top-0 h-full min-w-[3px] rounded-full transition-all",
                            colorClass,
                            "hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isActive && "z-[1] ring-2 ring-foreground/80 brightness-125",
                            disabled && "pointer-events-none opacity-50",
                          )}
                          style={{
                            left: `${position.leftPercent}%`,
                            width: `${position.widthPercent}%`,
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
