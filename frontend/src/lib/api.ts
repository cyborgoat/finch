import type {
  AiActionTemplate,
  ApiError,
  AudioAsset,
  Note,
  NoteSummary,
  Job,
  SpeakerMemoryStatus,
  SpeakerProfileDetail,
  SpeakerProfileSummary,
  Recording,
  RecordingSummary,
  UserSettings,
  LlmSettings,
  UpdateLlmSettings,
  TranscriptionSettings,
  UpdateTranscriptionSettings,
} from "@/lib/types"

import { getApiBaseUrl } from "@/lib/api-base"

export class FinchApiError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = "FinchApiError"
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, init)
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
    diarizationReady: boolean
    diarizationReason: string | null
    llmProvider?: string
    llmConfigured?: boolean
    openrouterConfigured: boolean
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

export async function getAudioAsset(audioId: string): Promise<AudioAsset> {
  return request(`/api/audio/${audioId}`)
}

export async function createRecordingJob(input: {
  audioAssetId: string
  language?: string
}): Promise<{ jobId: string; recordingId: string; status: string }> {
  return request("/api/recordings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function getJob(jobId: string): Promise<Job> {
  return request(`/api/jobs/${jobId}`)
}

export async function listRecordings(): Promise<{ items: RecordingSummary[] }> {
  return request("/api/recordings")
}

export async function getRecording(id: string): Promise<Recording> {
  return request(`/api/recordings/${id}`)
}

export async function updateRecording(
  id: string,
  input: Partial<Pick<Recording, "title" | "editedText" | "status">>,
): Promise<Recording> {
  return request(`/api/recordings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function deleteRecording(id: string): Promise<{ ok: boolean }> {
  return request(`/api/recordings/${id}`, { method: "DELETE" })
}

export async function createAiAction(input: {
  recordingId: string
  action: string
  source?: "rawText" | "editedText"
  model?: string
}): Promise<{ jobId: string; noteId: string; status: string }> {
  return request("/api/ai-actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recordingId: input.recordingId,
      action: input.action,
      source: input.source ?? "editedText",
      model: input.model,
    }),
  })
}

export async function listAiActionTemplates(): Promise<{ items: AiActionTemplate[] }> {
  return request("/api/ai-actions/templates")
}

export async function createNote(input: {
  recordingId: string
  title?: string
  markdown?: string
  type?: string
}): Promise<Note> {
  return request("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function listNotes(
  recordingId?: string,
): Promise<{ items: NoteSummary[] }> {
  const query = recordingId ? `?recordingId=${encodeURIComponent(recordingId)}` : ""
  return request(`/api/notes${query}`)
}

export async function getNote(id: string): Promise<Note> {
  return request(`/api/notes/${id}`)
}

export async function updateNote(
  id: string,
  input: Partial<Pick<Note, "title" | "markdown">>,
): Promise<Note> {
  return request(`/api/notes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function deleteNote(id: string): Promise<{ ok: boolean }> {
  return request(`/api/notes/${id}`, { method: "DELETE" })
}

export async function updateRecordingSpeakers(
  recordingId: string,
  mappings: Array<{
    clusterId: string
    displayName: string
    profileId?: string | null
    enroll?: boolean
    enrollStartSec?: number
    enrollEndSec?: number
  }>,
): Promise<{
  id: string
  speakerSegments: Recording["speakerSegments"]
  rawText: string
  updatedAt: string
}> {
  return request(`/api/recordings/${recordingId}/speakers`, {
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

export async function updateSpeakerProfile(
  id: string,
  payload: { displayName?: string; notes?: string | null },
): Promise<SpeakerProfileSummary> {
  return request(`/api/speaker-profiles/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
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

export async function getUserSettings(): Promise<UserSettings> {
  return request("/api/user-settings")
}

export async function updateUserSettings(
  patch: Partial<UserSettings>,
): Promise<UserSettings> {
  return request("/api/user-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
}

export async function getLlmSettings(): Promise<LlmSettings> {
  return request("/api/llm-settings")
}

export async function updateLlmSettings(
  patch: UpdateLlmSettings,
): Promise<LlmSettings> {
  return request("/api/llm-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
}

export async function getTranscriptionSettings(): Promise<TranscriptionSettings> {
  return request("/api/transcription-settings")
}

export async function updateTranscriptionSettings(
  patch: UpdateTranscriptionSettings,
): Promise<TranscriptionSettings> {
  return request("/api/transcription-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
}
