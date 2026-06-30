
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Section } from "@/components/layout/Section"
import { SpeakerTurnDialog } from "@/components/transcripts/SpeakerTurnDialog"
import { resolveSpeakerDisplayName } from "@/lib/speakerMappings"
import { findActiveSegmentIndex, formatPlaybackTime } from "@/lib/audio"
import { formatSpeakerTranscript } from "@/lib/transcriptFormat"
import type { SpeakerMemoryStatus, SpeakerProfileSummary, SpeakerSegment } from "@/lib/types"

type FullTranscriptPanelProps = {
  text: string
  segments?: SpeakerSegment[]
  profiles?: SpeakerProfileSummary[]
  memoryStatus?: SpeakerMemoryStatus
  currentPlaybackTime?: number
  onSeekToTime?: (seconds: number) => void
  onTextChange: (value: string) => void
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
  onTextChange,
  onSegmentSpeakerSave,
  speakerSavePending,
  disabled,
}: FullTranscriptPanelProps) {
  const [showAsSegments, setShowAsSegments] = useState(false)
  const [editingSegment, setEditingSegment] = useState<SpeakerSegment | null>(null)

  const hasTimedSegments = segments.some(
    (segment) => segment.endSec > segment.startSec,
  )
  const activeSegmentIndex = findActiveSegmentIndex(segments, currentPlaybackTime)

  const editingClusterId = editingSegment
    ? editingSegment.clusterId || editingSegment.speaker
    : ""

  const viewToggle = (
    <div className="flex items-center gap-2">
      <Label
        htmlFor="full-transcript-view-toggle"
        className={cn(
          "text-xs font-normal text-muted-foreground",
          !showAsSegments && "text-foreground",
        )}
      >
        Full text
      </Label>
      <Switch
        id="full-transcript-view-toggle"
        checked={showAsSegments}
        onCheckedChange={setShowAsSegments}
        disabled={segments.length === 0}
      />
      <Label
        htmlFor="full-transcript-view-toggle"
        className={cn(
          "text-xs font-normal text-muted-foreground",
          showAsSegments && "text-foreground",
        )}
      >
        Segments
      </Label>
    </div>
  )

  return (
    <>
      <Section
        title="Full transcript"
        action={viewToggle}
        description={
          showAsSegments
            ? "All turns with speaker labels. Click a timestamp to jump in the audio."
            : "Edit the complete transcript as plain text."
        }
      >
        {showAsSegments ? (
          segments.length > 0 ? (
            <div className="surface-card space-y-4">
              {segments.map((segment, index) => {
                const clusterId = segment.clusterId || segment.speaker
                const displayName = resolveSpeakerDisplayName(clusterId, {
                  segment,
                  profiles,
                  fallback: segment.speaker,
                })
                const isUnknown =
                  segment.matchStatus === "unknown" ||
                  displayName.toLowerCase().startsWith("unknown speaker")
                const isActive = index === activeSegmentIndex

                const start = formatTime(segment.startSec)
                const end = formatTime(segment.endSec)
                const timeRange =
                  hasTimedSegments && start && end ? `${start} – ${end}` : null

                return (
                  <div
                    key={`${clusterId}-${segment.startSec}-${index}`}
                    className={cn(
                      "space-y-2 rounded-lg border border-transparent pb-4 transition-colors last:pb-0",
                      index < segments.length - 1 && "border-b border-border/60",
                      isActive && "border-primary/20 bg-primary/5 px-3 py-3 -mx-3",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {onSegmentSpeakerSave ? (
                        <button
                          type="button"
                          disabled={disabled || speakerSavePending}
                          onClick={() => setEditingSegment(segment)}
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
                        <Badge variant={isUnknown ? "outline" : "secondary"}>
                          {displayName}
                        </Badge>
                      )}
                      {timeRange ? (
                        onSeekToTime ? (
                          <button
                            type="button"
                            disabled={disabled || speakerSavePending}
                            onClick={() => onSeekToTime(segment.startSec)}
                            className="rounded-sm text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {timeRange}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">{timeRange}</span>
                        )
                      ) : null}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/90">{segment.text}</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="section-hint">No segments available for this transcript.</p>
          )
        ) : (
          <ScrollArea className="surface-card rounded-xl border border-border">
            <Textarea
              id="transcript-text"
              value={text}
              disabled={disabled}
              onChange={(event) => onTextChange(event.target.value)}
              placeholder={
                segments.length > 0 ? formatSpeakerTranscript(segments) : undefined
              }
              className="min-h-[280px] resize-none border-0 bg-transparent font-mono text-sm leading-relaxed shadow-none focus-visible:ring-0"
            />
          </ScrollArea>
        )}
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
