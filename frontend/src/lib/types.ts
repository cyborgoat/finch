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
  clusterId?: string | null
  speakerProfileId?: string | null
  matchConfidence?: number | null
  matchStatus?: "matched" | "unknown" | "manual" | "unmatched" | null
}

export type SpeakerProfileSummary = {
  id: string
  displayName: string
  notes?: string | null
  embeddingCount: number
  relatedRecordingCount?: number
  createdAt: string
  updatedAt: string
}

export type SpeakerEmbeddingSummary = {
  id: string
  modelId: string
  sourceRecordingId?: string | null
  sourceClusterId?: string | null
  durationSec?: number | null
  dimensions: number
  createdAt: string
}

export type RelatedRecordingSummary = {
  id: string
  title: string
  segmentCount: number
  updatedAt: string
}

export type SpeakerProfileDetail = {
  id: string
  displayName: string
  notes?: string | null
  embeddingCount: number
  embeddingDescription: string
  embeddings: SpeakerEmbeddingSummary[]
  relatedRecordings: RelatedRecordingSummary[]
  createdAt: string
  updatedAt: string
}

export type SpeakerMemoryStatus = {
  enabled: boolean
  consentGiven: boolean
  consentAt?: string | null
  profileCount: number
  ready: boolean
  reason?: string | null
}

export type UserSettings = {
  uiLanguage: "en" | "zh"
  contentLanguage: "en" | "zh"
  summaryStyle: "concise" | "balanced" | "detailed"
  summaryFormat: "paragraphs" | "bullets"
  userName: string
  userSpeakerProfileId: string | null
  notesAutoSave: boolean
}

export type NoteType =
  | "note"
  | "meeting_summary"
  | "markdown_summary"
  | "action_items"
  | "key_decisions"
  | "follow_up_email"
  | string

export type AiActionTemplate = {
  id: string
  title: string
  description: string
  noteType: string
}

export type LlmProviderId = "openrouter" | "openai" | "anthropic" | "custom"

export type LlmProviderInfo = {
  id: LlmProviderId
  displayName: string
  defaultBaseUrl: string
  defaultModel: string
}

export type LlmSettings = {
  provider: LlmProviderId
  providerDisplayName: string
  apiKeyConfigured: boolean
  baseUrl: string
  defaultModel: string
  configured: boolean
  source: "stored" | "unset"
  providers: LlmProviderInfo[]
}

export type UpdateLlmSettings = {
  provider?: LlmProviderId
  apiKey?: string
  baseUrl?: string
  defaultModel?: string
}

export type TranscriptionSettings = {
  diarizationEnabled: boolean
  diarizationReady: boolean
  diarizationReason?: string | null
  speakerMemoryEnabled: boolean
  speakerMemoryReady: boolean
  speakerMemoryReason?: string | null
  speakerAutoLabelEnabled: boolean
  hfTokenConfigured: boolean
  source: "stored" | "unset"
}

export type UpdateTranscriptionSettings = {
  diarizationEnabled?: boolean
  speakerMemoryEnabled?: boolean
  speakerAutoLabelEnabled?: boolean
  hfToken?: string
}

export type Recording = {
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

export type RecordingSummary = {
  id: string
  audioAssetId: string
  title: string
  language?: string | null
  status: "draft" | "final" | "transcribing" | "failed"
  durationSeconds?: number | null
  errorMessage?: string | null
  createdAt: string
  updatedAt: string
}

export type NoteStatus = "ready" | "generating" | "failed"

export type NoteSummary = {
  id: string
  recordingId: string
  title: string
  type: Note["type"]
  model: string
  status: NoteStatus
  generationJobId?: string | null
  createdAt: string
  updatedAt: string
}

export type Note = {
  id: string
  recordingId: string
  title: string
  type: NoteType
  markdown: string
  model: string
  promptVersion: string
  status: NoteStatus
  generationJobId?: string | null
  createdAt: string
  updatedAt: string
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
