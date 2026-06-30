"use client"

import Link from "next/link"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Section } from "@/components/layout/Section"
import { SpeakerTurnDialog } from "@/components/transcripts/SpeakerTurnDialog"
import { resolveSpeakerDisplayName } from "@/lib/speakerMappings"
import type { SpeakerSegment } from "@/lib/types"
import type { SpeakerMemoryStatus, SpeakerProfileSummary } from "@/lib/types"
import { formatSpeakerTranscript } from "@/lib/transcriptFormat"

type TranscriptEditorProps = {
  title: string
  text: string
  speakerSegments?: SpeakerSegment[] | null
  profiles?: SpeakerProfileSummary[]
  memoryStatus?: SpeakerMemoryStatus
  processingNote?: string | null
  onTitleChange: (value: string) => void
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
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function TranscriptEditor({
  title,
  text,
  speakerSegments,
  profiles = [],
  memoryStatus,
  processingNote,
  onTitleChange,
  onTextChange,
  onSegmentSpeakerSave,
  speakerSavePending,
  disabled,
}: TranscriptEditorProps) {
  const segments = speakerSegments ?? []
  const hasTimedSegments = segments.some(
    (segment) => segment.endSec > segment.startSec,
  )

  const [editingSegment, setEditingSegment] = useState<SpeakerSegment | null>(null)

  const editingClusterId = editingSegment
    ? editingSegment.clusterId || editingSegment.speaker
    : ""

  return (
    <div className="section-stack max-w-3xl">
      <Section title="Title">
        <Input
          id="transcript-title"
          value={title}
          disabled={disabled}
          onChange={(e) => onTitleChange(e.target.value)}
          className="border-0 bg-transparent px-0 text-lg font-medium shadow-none focus-visible:ring-0"
          placeholder="Untitled transcript"
        />
      </Section>

      {processingNote ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          {processingNote}
        </div>
      ) : null}

      {segments.length > 0 ? (
        <Section
          title="Transcript"
          description="Click a speaker label on any turn to assign or update their profile."
        >
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

              const start = formatTime(segment.startSec)
              const end = formatTime(segment.endSec)
              const timeRange =
                hasTimedSegments && start && end ? `${start} – ${end}` : null

              return (
                <div
                  key={`${clusterId}-${segment.startSec}-${index}`}
                  className="space-y-2 border-b border-border/60 pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={disabled || speakerSavePending}
                      onClick={() => setEditingSegment(segment)}
                      className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
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
                    {timeRange ? (
                      <span className="text-xs text-muted-foreground">{timeRange}</span>
                    ) : null}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">{segment.text}</p>
                </div>
              )
            })}
          </div>
        </Section>
      ) : !processingNote ? (
        <p className="section-hint">
          No speaker labels for this transcript. Enable diarization in{" "}
          <Link href="/settings" className="text-foreground underline-offset-4 hover:underline">
            Settings
          </Link>{" "}
          and re-transcribe to label speakers.
        </p>
      ) : null}

      <Section
        title="Full text"
        description="Edit the complete transcript. Speaker labels are updated via the pills above."
      >
        <ScrollArea className="rounded-xl border border-border">
          <Textarea
            id="transcript-text"
            value={text}
            disabled={disabled}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={
              segments.length > 0 ? formatSpeakerTranscript(segments) : undefined
            }
            className="min-h-[320px] resize-none border-0 bg-transparent font-mono text-sm leading-relaxed shadow-none focus-visible:ring-0"
          />
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
    </div>
  )
}
