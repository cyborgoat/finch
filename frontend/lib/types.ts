export type AudioAsset = {
  id: string
  source: "upload" | "recording"
  filename: string
  mimeType: string
  sizeBytes: number
  durationSeconds?: number
  createdAt: string
}

export type SpeakerSegment = {
  speaker: string
  startSec: number
  endSec: number
  text: string
}

export type Transcript = {
  id: string
  audioAssetId: string
  title: string
  rawText: string
  editedText?: string | null
  language?: string | null
  status: "draft" | "final" | "transcribing" | "failed"
  speakerSegments?: SpeakerSegment[] | null
  errorMessage?: string | null
  processingNote?: string | null
  createdAt: string
  updatedAt: string
}

export type TranscriptSummary = {
  id: string
  audioAssetId: string
  title: string
  language?: string | null
  status: "draft" | "final" | "transcribing" | "failed"
  errorMessage?: string | null
  createdAt: string
  updatedAt: string
}

export type DocumentSummary = {
  id: string
  transcriptId: string
  title: string
  type: Document["type"]
  model: string
  createdAt: string
  updatedAt: string
}

export type Document = {
  id: string
  transcriptId: string
  title: string
  type:
    | "markdown_summary"
    | "meeting_notes"
    | "action_items"
    | "clean_transcript"
    | "study_notes"
    | "custom"
  markdown: string
  model: string
  promptVersion: string
  createdAt: string
  updatedAt: string
}

export type AiActionTemplate = {
  id: string
  name: string
  description: string
}

export type Job = {
  id: string
  type: "transcription" | "ai_action"
  status: "queued" | "processing" | "completed" | "failed"
  progress: number
  stage?: string | null
  resultId?: string | null
  error?: string | null
  createdAt: string
  updatedAt: string
}

export type ApiError = {
  error: {
    code: string
    message: string
  }
}
