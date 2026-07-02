import { useEffect, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Section } from "@/components/layout/Section"
import { SpeakerTurnDialog } from "@/components/transcripts/SpeakerTurnDialog"
import { formatPlaybackTime, getCurrentSegmentIndex } from "@/lib/audio"
import { resolveSpeakerDisplayName } from "@/lib/voiceprintLabels"
import type { VoiceprintProfilesStatus, VoiceprintProfileSummary, SpeakerSegment } from "@/lib/types"

const VIRTUALIZE_SEGMENT_THRESHOLD = 50
const ESTIMATED_SEGMENT_HEIGHT = 72

type FullTranscriptPanelProps = {
  text: string
  segments?: SpeakerSegment[]
  profiles?: VoiceprintProfileSummary[]
  voiceprintProfilesStatus?: VoiceprintProfilesStatus
  currentPlaybackTime?: number
  onSeekToTime?: (seconds: number) => void
  onSegmentSpeakerSave?: (
    clusterId: string,
    segment: SpeakerSegment,
    payload: { displayName: string; profileId: string | null; enroll: boolean },
  ) => Promise<void>
  speakerSavePending?: boolean
  disabled?: boolean
}

function formatTime(seconds: number) {
  if (seconds <= 0) return null
  return formatPlaybackTime(seconds)
}

type SegmentTurnProps = {
  segment: SpeakerSegment
  index: number
  displayName: string
  hasTimedSegments: boolean
  isActive: boolean
  disabled?: boolean
  speakerSavePending?: boolean
  onSeekToTime?: (seconds: number) => void
  onEditSpeaker?: (segment: SpeakerSegment) => void
  onSegmentSpeakerSave?: FullTranscriptPanelProps["onSegmentSpeakerSave"]
  turnRef?: (element: HTMLDivElement | null) => void
}

function SegmentTurn({
  segment,
  displayName,
  hasTimedSegments,
  isActive,
  disabled,
  speakerSavePending,
  onSeekToTime,
  onEditSpeaker,
  onSegmentSpeakerSave,
  turnRef,
}: SegmentTurnProps) {
  const start = formatTime(segment.startSec)
  const end = formatTime(segment.endSec)
  const timeRange =
    hasTimedSegments && start && end ? `${start} – ${end}` : null

  const speakerLabel = onSegmentSpeakerSave ? (
    <button
      type="button"
      disabled={disabled || speakerSavePending}
      onClick={() => onEditSpeaker?.(segment)}
      className="text-xs font-medium text-foreground/55 transition-colors hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
    >
      {displayName}
    </button>
  ) : (
    <span className="text-xs font-medium text-foreground/55">{displayName}</span>
  )

  return (
    <div
      ref={turnRef}
      className={cn(
        "scroll-mt-24 scroll-mb-24 rounded-sm px-2 py-1.5 transition-colors",
        isActive && "bg-primary/8",
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {speakerLabel}
        {timeRange ? (
          onSeekToTime ? (
            <button
              type="button"
              disabled={disabled || speakerSavePending}
              onClick={() => onSeekToTime(segment.startSec)}
              className="text-[11px] tabular-nums text-muted-foreground/65 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              {timeRange}
            </button>
          ) : (
            <span className="text-[11px] tabular-nums text-muted-foreground/65">
              {timeRange}
            </span>
          )
        ) : null}
      </div>
      <p className="mt-0.5 text-xs leading-snug text-foreground/90">{segment.text}</p>
    </div>
  )
}

export function FullTranscriptPanel({
  text,
  segments = [],
  profiles = [],
  voiceprintProfilesStatus,
  currentPlaybackTime = 0,
  onSeekToTime,
  onSegmentSpeakerSave,
  speakerSavePending,
  disabled,
}: FullTranscriptPanelProps) {
  const { t } = useTranslation()
  const [editingSegment, setEditingSegment] = useState<SpeakerSegment | null>(null)
  const scrollParentRef = useRef<HTMLDivElement | null>(null)
  const turnRefs = useRef<(HTMLDivElement | null)[]>([])

  const hasTimedSegments = segments.some(
    (segment) => segment.endSec > segment.startSec,
  )
  const currentSegmentIndex = getCurrentSegmentIndex(segments, currentPlaybackTime)
  const useVirtualList = segments.length >= VIRTUALIZE_SEGMENT_THRESHOLD

  const virtualizer = useVirtualizer({
    count: segments.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => ESTIMATED_SEGMENT_HEIGHT,
    overscan: 8,
    enabled: useVirtualList,
  })

  const editingClusterId = editingSegment
    ? editingSegment.clusterId || editingSegment.speaker
    : ""

  useEffect(() => {
    if (currentSegmentIndex < 0) return
    if (useVirtualList) {
      virtualizer.scrollToIndex(currentSegmentIndex, { align: "center" })
      return
    }
    const turn = turnRefs.current[currentSegmentIndex]
    turn?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [currentSegmentIndex, useVirtualList, virtualizer])

  const renderSegment = (segment: SpeakerSegment, index: number, turnRef?: (element: HTMLDivElement | null) => void) => {
    const clusterId = segment.clusterId || segment.speaker
    const displayName = resolveSpeakerDisplayName(clusterId, {
      segment,
      profiles,
      fallback:
        segment.matchStatus === "unknown"
          ? t("recording.unknownSpeaker")
          : segment.speaker,
    })

    return (
      <SegmentTurn
        key={`${clusterId}-${segment.startSec}-${index}`}
        segment={segment}
        index={index}
        displayName={displayName}
        hasTimedSegments={hasTimedSegments}
        isActive={index === currentSegmentIndex}
        disabled={disabled}
        speakerSavePending={speakerSavePending}
        onSeekToTime={onSeekToTime}
        onEditSpeaker={setEditingSegment}
        onSegmentSpeakerSave={onSegmentSpeakerSave}
        turnRef={turnRef}
      />
    )
  }

  return (
    <>
      <Section title={t("recording.sectionTitle")}>
        <div
          ref={scrollParentRef}
          className="surface-card h-96 overflow-y-auto rounded-xl border border-border"
        >
          {segments.length > 0 ? (
            useVirtualList ? (
              <div
                className="relative w-full p-3"
                style={{ height: `${virtualizer.getTotalSize()}px` }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const segment = segments[virtualRow.index]
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      className="absolute top-0 left-0 w-full"
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                    >
                      {renderSegment(segment, virtualRow.index)}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-1 p-3">
                {segments.map((segment, index) =>
                  renderSegment(segment, index, (element) => {
                    turnRefs.current[index] = element
                  }),
                )}
              </div>
            )
          ) : (
            <pre className="whitespace-pre-wrap p-3 text-xs leading-snug text-foreground/90">
              {text}
            </pre>
          )}
        </div>
      </Section>

      {editingSegment && onSegmentSpeakerSave ? (
        <SpeakerTurnDialog
          key={`${editingClusterId}-${editingSegment.startSec}-${editingSegment.endSec}`}
          open={Boolean(editingSegment)}
          onOpenChange={(open) => {
            if (!open) setEditingSegment(null)
          }}
          segment={editingSegment}
          clusterId={editingClusterId}
          profiles={profiles}
          voiceprintProfilesStatus={voiceprintProfilesStatus}
          isPending={speakerSavePending}
          onSave={(payload) =>
            onSegmentSpeakerSave(editingClusterId, editingSegment, payload)
          }
        />
      ) : null}
    </>
  )
}
