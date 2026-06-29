"use client"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { SpeakerSegment } from "@/lib/types"
import { formatSpeakerTranscript } from "@/lib/transcriptFormat"

type TranscriptEditorProps = {
  title: string
  text: string
  speakerSegments?: SpeakerSegment[] | null
  processingNote?: string | null
  onTitleChange: (value: string) => void
  onTextChange: (value: string) => void
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
  processingNote,
  onTitleChange,
  onTextChange,
  disabled,
}: TranscriptEditorProps) {
  const segments = speakerSegments ?? []
  const hasTimedSegments = segments.some(
    (segment) => segment.endSec > segment.startSec,
  )

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="transcript-title">
          Title
        </label>
        <Input
          id="transcript-title"
          value={title}
          disabled={disabled}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>

      {processingNote && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-muted-foreground">
          {processingNote}
        </div>
      )}

      {segments.length > 0 ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium">By speaker</p>
          <div className="space-y-4">
            {segments.map((segment, index) => {
              const start = formatTime(segment.startSec)
              const end = formatTime(segment.endSec)
              const timeRange =
                hasTimedSegments && start && end ? `${start} – ${end}` : null

              return (
                <div
                  key={`${segment.speaker}-${segment.startSec}-${index}`}
                  className="space-y-1 border-b border-border/60 pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{segment.speaker}</Badge>
                    {timeRange && (
                      <span className="text-xs text-muted-foreground">{timeRange}</span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed">
                    <span className="font-medium">{segment.speaker}:</span>{" "}
                    {segment.text}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        !processingNote && (
          <p className="text-sm text-muted-foreground">
            No speaker labels for this transcript. Enable diarization with{" "}
            <code className="text-xs">HF_TOKEN</code> and re-transcribe to label
            speakers.
          </p>
        )
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="transcript-text">
          Full transcript
        </label>
        <Textarea
          id="transcript-text"
          value={text}
          disabled={disabled}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={
            segments.length > 0 ? formatSpeakerTranscript(segments) : undefined
          }
          className="min-h-[420px] resize-y font-mono text-sm leading-relaxed"
        />
      </div>
    </div>
  )
}
