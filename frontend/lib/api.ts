import type {
  AiActionTemplate,
  ApiError,
  AudioAsset,
  Document,
  DocumentSummary,
  Job,
  SpeakerMemoryStatus,
  SpeakerProfileDetail,
  SpeakerProfileSummary,
  Transcript,
  TranscriptSummary,
} from "@/lib/types"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"

export class FinchApiError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = "FinchApiError"
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init)
  if (!response.ok) {
    let message = response.statusText
    let code = "REQUEST_FAILED"
    try {
      const body = (await response.json()) as ApiError
      if (body.error) {
        code = body.error.code
        message = body.error.message
      }
    } catch {
      // ignore parse errors
    }
    throw new FinchApiError(code, message)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export async function getHealth(): Promise<{
  status: string
  app: string
  capabilities?: {
    diarizationEnabled: boolean
    diarizationMock: boolean
    diarizationReady: boolean
    diarizationReason: string | null
    asrMock: boolean
    llmMock: boolean
    openrouterConfigured: boolean
    speakerMemoryEnabled?: boolean
    speakerMemoryMock?: boolean
    speakerMemoryReady?: boolean
    speakerMemoryReason?: string | null
    speakerMemoryConsentGiven?: boolean
  }
}> {
  return request("/api/health")
}

export async function uploadAudio(
  file: File,
  source: "upload" | "recording",
): Promise<AudioAsset> {
  const form = new FormData()
  form.append("file", file)
  form.append("source", source)
  return request("/api/audio/upload", { method: "POST", body: form })
}

export async function createTranscriptJob(input: {
  audioAssetId: string
  language?: string
}): Promise<{ jobId: string; transcriptId: string; status: string }> {
  return request("/api/transcripts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function getJob(jobId: string): Promise<Job> {
  return request(`/api/jobs/${jobId}`)
}

export async function listTranscripts(): Promise<{ items: TranscriptSummary[] }> {
  return request("/api/transcripts")
}

export async function getTranscript(id: string): Promise<Transcript> {
  return request(`/api/transcripts/${id}`)
}

export async function updateTranscript(
  id: string,
  input: Partial<Pick<Transcript, "title" | "editedText" | "status">>,
): Promise<Transcript> {
  return request(`/api/transcripts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function deleteTranscript(id: string): Promise<{ ok: boolean }> {
  return request(`/api/transcripts/${id}`, { method: "DELETE" })
}

export async function listAiActionTemplates(): Promise<{ items: AiActionTemplate[] }> {
  return request("/api/ai-actions/templates")
}

export async function createAiActionJob(input: {
  transcriptId: string
  action: string
  source?: "rawText" | "editedText"
  model?: string
  customPrompt?: string
}): Promise<{ jobId: string; status: string }> {
  return request("/api/ai-actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function listDocuments(
  transcriptId?: string,
): Promise<{ items: DocumentSummary[] }> {
  const query = transcriptId ? `?transcriptId=${encodeURIComponent(transcriptId)}` : ""
  return request(`/api/documents${query}`)
}

export async function getDocument(id: string): Promise<Document> {
  return request(`/api/documents/${id}`)
}

export async function updateDocument(
  id: string,
  input: Partial<Pick<Document, "title" | "markdown">>,
): Promise<Document> {
  return request(`/api/documents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function deleteDocument(id: string): Promise<{ ok: boolean }> {
  return request(`/api/documents/${id}`, { method: "DELETE" })
}

export async function updateTranscriptSpeakers(
  transcriptId: string,
  mappings: Array<{
    clusterId: string
    displayName: string
    profileId?: string | null
    enroll?: boolean
  }>,
): Promise<{
  id: string
  speakerSegments: Transcript["speakerSegments"]
  rawText: string
  updatedAt: string
}> {
  return request(`/api/transcripts/${transcriptId}/speakers`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mappings }),
  })
}

export async function listSpeakerProfiles(): Promise<{
  items: SpeakerProfileSummary[]
}> {
  return request("/api/speaker-profiles")
}

export async function getSpeakerProfile(id: string): Promise<SpeakerProfileDetail> {
  return request(`/api/speaker-profiles/${id}`)
}

export async function deleteSpeakerProfile(id: string): Promise<{ ok: boolean }> {
  return request(`/api/speaker-profiles/${id}`, { method: "DELETE" })
}

export async function getSpeakerMemoryStatus(): Promise<SpeakerMemoryStatus> {
  return request("/api/speaker-memory/status")
}

export async function recordSpeakerMemoryConsent(): Promise<{ consentAt: string }> {
  return request("/api/speaker-memory/consent", { method: "POST" })
}

export async function toggleSpeakerMemory(enabled: boolean): Promise<SpeakerMemoryStatus> {
  return request("/api/speaker-memory/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  })
}

export async function deleteSpeakerMemoryData(): Promise<{ ok: boolean }> {
  return request("/api/speaker-memory/data", { method: "DELETE" })
}
