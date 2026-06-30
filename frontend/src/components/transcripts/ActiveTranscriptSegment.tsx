import { useState } from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Section } from "@/components/layout/Section"
import { SpeakerTurnDialog } from "@/components/transcripts/SpeakerTurnDialog"
import { resolveSpeakerDisplayName } from "@/lib/speakerMappings"
import { formatPlaybackTime, getCurrentSegmentIndex } from "@/lib/audio"
import type { SpeakerMemoryStatus, SpeakerProfileSummary, SpeakerSegment } from "@/lib/types"

type ActiveTranscriptSegmentProps = {
  segments: SpeakerSegment[]
  fallbackText?: string
  profiles?: SpeakerProfileSummary[]
  memoryStatus?: SpeakerMemoryStatus
  processingNote?: string | null
  currentPlaybackTime?: number
  isPlaying?: boolean
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

export function ActiveTranscriptSegment({
  segments,
  fallbackText,
  profiles = [],
  memoryStatus,
  processingNote,
  currentPlaybackTime = 0,
  isPlaying = false,
  onSeekToTime,
  onSegmentSpeakerSave,
  speakerSavePending,
  disabled,
}: ActiveTranscriptSegmentProps) {
  const [editingSegment, setEditingSegment] = useState<SpeakerSegment | null>(null)
  const [manualIndex, setManualIndex] = useState<number | null>(null)

  const playbackIndex = getCurrentSegmentIndex(segments, currentPlaybackTime)
  const displayIndex = isPlaying
    ? playbackIndex
    : manualIndex ?? playbackIndex

  const editingClusterId = editingSegment
    ? editingSegment.clusterId || editingSegment.speaker
    : ""

  const hasTimedSegments = segments.some(
    (segment) => segment.endSec > segment.startSec,
  )

  const navigateSegment = (direction: -1 | 1) => {
    if (segments.length === 0) return
    const baseIndex = displayIndex >= 0 ? displayIndex : 0
    const nextIndex = Math.min(
      segments.length - 1,
      Math.max(0, baseIndex + direction),
    )
    setManualIndex(nextIndex)
    onSeekToTime?.(segments[nextIndex].startSec)
  }

  const navigation =
    segments.length > 1 ? (
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={disabled || displayIndex <= 0}
          onClick={() => navigateSegment(-1)}
          aria-label="Previous turn"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-muted-foreground">
          {displayIndex >= 0 ? `${displayIndex + 1} / ${segments.length}` : "—"}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={disabled || displayIndex >= segments.length - 1}
          onClick={() => navigateSegment(1)}
          aria-label="Next turn"
        >
          <ArrowRight className="size-4" />
        </Button>
      </div>
    ) : null

  if (segments.length === 0) {
    if (fallbackText?.trim()) {
      return (
        <Section title="Current turn">
          <div className="surface-card">
            <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
              {fallbackText}
            </p>
          </div>
        </Section>
      )
    }

    if (processingNote) {
      return (
        <Section title="Current turn">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            {processingNote}
          </div>
        </Section>
      )
    }

    return (
      <Section title="Current turn">
        <p className="section-hint">
          No transcript segments yet. Configure diarization in the backend and
          re-transcribe to label speakers by turn.
        </p>
      </Section>
    )
  }

  const currentSegment = displayIndex >= 0 ? segments[displayIndex] : null

  if (!currentSegment) {
    return (
      <Section title="Current turn" action={navigation}>
        <div className="surface-card text-sm text-muted-foreground">
          Press play to follow the transcript turn by turn.
        </div>
      </Section>
    )
  }

  const clusterId = currentSegment.clusterId || currentSegment.speaker
  const displayName = resolveSpeakerDisplayName(clusterId, {
    segment: currentSegment,
    profiles,
    fallback: currentSegment.speaker,
  })
  const isUnknown =
    currentSegment.matchStatus === "unknown" ||
    displayName.toLowerCase().startsWith("unknown speaker")

  const start = formatTime(currentSegment.startSec)
  const end = formatTime(currentSegment.endSec)
  const timeRange =
    hasTimedSegments && start && end ? `${start} – ${end}` : null

  return (
    <>
      <Section
        title="Current turn"
        action={navigation}
        description="Follows playback while playing. Use the arrows to browse turns."
      >
        <div className="surface-card space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {onSegmentSpeakerSave ? (
              <button
                type="button"
                disabled={disabled || speakerSavePending}
                onClick={() => setEditingSegment(currentSegment)}
                className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Badge
                  variant={isUnknown ? "outline" : "secondary"}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted",
                    isUnknown && "border-dashed",
                  )}
                >
                  {displayName}
                </Badge>
              </button>
            ) : (
              <Badge variant={isUnknown ? "outline" : "secondary"}>{displayName}</Badge>
            )}
            {timeRange ? (
              onSeekToTime ? (
                <button
                  type="button"
                  disabled={disabled || speakerSavePending}
                  onClick={() => onSeekToTime(currentSegment.startSec)}
                  className="rounded-sm text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {timeRange}
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">{timeRange}</span>
              )
            ) : null}
          </div>
          <p className="text-base leading-relaxed text-foreground/90">{currentSegment.text}</p>
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
