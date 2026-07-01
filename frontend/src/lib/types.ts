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
  relatedTranscriptCount?: number
  createdAt: string
  updatedAt: string
}

export type SpeakerEmbeddingSummary = {
  id: string
  modelId: string
  sourceTranscriptId?: string | null
  sourceClusterId?: string | null
  durationSec?: number | null
  dimensions: number
  createdAt: string
}

export type RelatedTranscriptSummary = {
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
  relatedTranscripts: RelatedTranscriptSummary[]
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
  language: "en" | "zh"
  summaryStyle: "concise" | "balanced" | "detailed"
  summaryFormat: "paragraphs" | "bullets"
  userName: string
  userSpeakerProfileId: string | null
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
  durationSeconds?: number | null
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
  type: "markdown_summary" | string
  markdown: string
  model: string
  promptVersion: string
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
