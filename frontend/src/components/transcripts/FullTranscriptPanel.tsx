import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Section } from "@/components/layout/Section"
import { SpeakerTurnDialog } from "@/components/transcripts/SpeakerTurnDialog"
import { formatPlaybackTime, getCurrentSegmentIndex } from "@/lib/audio"
import { resolveSpeakerDisplayName } from "@/lib/speakerMappings"
import type { SpeakerMemoryStatus, SpeakerProfileSummary, SpeakerSegment } from "@/lib/types"

type FullTranscriptPanelProps = {
  text: string
  segments?: SpeakerSegment[]
  profiles?: SpeakerProfileSummary[]
  memoryStatus?: SpeakerMemoryStatus
  currentPlaybackTime?: number
  onSeekToTime?: (seconds: number) => void
  onSegmentSpeakerSave?: (
    clusterId: string,
    segment: SpeakerSegment,
    payload: { displayName: string; profileId?: string },
  ) => Promise<void>
  speakerSavePending?: boolean
  disabled?: boolean
}

function formatTime(seconds: number) {
  if (seconds <= 0) return null
  return formatPlaybackTime(seconds)
}

export function FullTranscriptPanel({
  text,
  segments = [],
  profiles = [],
  memoryStatus,
  currentPlaybackTime = 0,
  onSeekToTime,
  onSegmentSpeakerSave,
  speakerSavePending,
  disabled,
}: FullTranscriptPanelProps) {
  const [editingSegment, setEditingSegment] = useState<SpeakerSegment | null>(null)
  const turnRefs = useRef<(HTMLDivElement | null)[]>([])

  const hasTimedSegments = segments.some(
    (segment) => segment.endSec > segment.startSec,
  )
  const currentSegmentIndex = getCurrentSegmentIndex(segments, currentPlaybackTime)

  const editingClusterId = editingSegment
    ? editingSegment.clusterId || editingSegment.speaker
    : ""

  useEffect(() => {
    if (currentSegmentIndex < 0) return
    const turn = turnRefs.current[currentSegmentIndex]
    turn?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [currentSegmentIndex])

  return (
    <>
      <Section title="Transcript">
        <ScrollArea className="surface-card h-96 rounded-xl border border-border">
          {segments.length > 0 ? (
            <div className="space-y-1 p-3">
              {segments.map((segment, index) => {
                const clusterId = segment.clusterId || segment.speaker
                const displayName = resolveSpeakerDisplayName(clusterId, {
                  segment,
                  profiles,
                  fallback: segment.speaker,
                })
                const isActive = index === currentSegmentIndex

                const start = formatTime(segment.startSec)
                const end = formatTime(segment.endSec)
                const timeRange =
                  hasTimedSegments && start && end ? `${start} – ${end}` : null

                const speakerLabel = onSegmentSpeakerSave ? (
                  <button
                    type="button"
                    disabled={disabled || speakerSavePending}
                    onClick={() => setEditingSegment(segment)}
                    className="text-xs font-medium text-foreground/55 transition-colors hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    {displayName}
                  </button>
                ) : (
                  <span className="text-xs font-medium text-foreground/55">
                    {displayName}
                  </span>
                )

                return (
                  <div
                    key={`${clusterId}-${segment.startSec}-${index}`}
                    ref={(element) => {
                      turnRefs.current[index] = element
                    }}
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
                    <p className="mt-0.5 text-xs leading-snug text-foreground/90">
                      {segment.text}
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap p-3 text-xs leading-snug text-foreground/90">
              {text}
            </pre>
          )}
        </ScrollArea>
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
          memoryStatus={memoryStatus}
          isPending={speakerSavePending}
          onSave={(payload) => {
            void onSegmentSpeakerSave(editingClusterId, editingSegment, payload).then(
              () => setEditingSegment(null),
            )
          }}
        />
      ) : null}
    </>
  )
}
