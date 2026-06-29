"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type TranscriptEditorProps = {
  title: string
  text: string
  onTitleChange: (value: string) => void
  onTextChange: (value: string) => void
  disabled?: boolean
}

export function TranscriptEditor({
  title,
  text,
  onTitleChange,
  onTextChange,
  disabled,
}: TranscriptEditorProps) {
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
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="transcript-text">
          Transcript
        </label>
        <Textarea
          id="transcript-text"
          value={text}
          disabled={disabled}
          onChange={(e) => onTextChange(e.target.value)}
          className="min-h-[420px] resize-y font-mono text-sm leading-relaxed"
        />
      </div>
    </div>
  )
}
