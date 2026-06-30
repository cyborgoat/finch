"use client"

import { Input } from "@/components/ui/input"
import { Section } from "@/components/layout/Section"

type TranscriptEditorProps = {
  title: string
  onTitleChange: (value: string) => void
  disabled?: boolean
}

export function TranscriptEditor({
  title,
  onTitleChange,
  disabled,
}: TranscriptEditorProps) {
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
    </div>
  )
}
