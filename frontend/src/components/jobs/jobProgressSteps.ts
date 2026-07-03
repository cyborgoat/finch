import type { Job } from "@/lib/types"

export type JobProgressType = "transcription" | "ai_action"

export type ProgressStep = {
  id: string
  labelKey: string
}

export const TRANSCRIPTION_PROGRESS_STEPS: ProgressStep[] = [
  { id: "prepare", labelKey: "jobs.compact.prepare" },
  { id: "diarize", labelKey: "jobs.compact.diarize" },
  { id: "transcribe", labelKey: "jobs.compact.transcribe" },
  { id: "save", labelKey: "jobs.compact.saveRecording" },
]

export const AI_ACTION_PROGRESS_STEPS: ProgressStep[] = [
  { id: "prepare", labelKey: "jobs.compact.prepare" },
  { id: "generate", labelKey: "jobs.compact.generateNote" },
  { id: "save", labelKey: "jobs.compact.saveNote" },
]

function stageMatches(stage: string, pattern: string): boolean {
  if (pattern.endsWith("*")) {
    return stage.startsWith(pattern.slice(0, -1))
  }
  return stage === pattern
}

const TRANSCRIPTION_STAGE_TO_STEP: Array<{ patterns: string[]; stepIndex: number }> = [
  { patterns: ["queued", "loading_model", "purifying_audio"], stepIndex: 0 },
  { patterns: ["running_diarization"], stepIndex: 1 },
  {
    patterns: ["running_asr", "running_asr_chunk_*", "running_asr_segment_*"],
    stepIndex: 2,
  },
  { patterns: ["saving_recording"], stepIndex: 3 },
]

const AI_ACTION_STAGE_TO_STEP: Array<{ patterns: string[]; stepIndex: number }> = [
  { patterns: ["queued", "loading_model", "loading_recording"], stepIndex: 0 },
  { patterns: ["calling_llm"], stepIndex: 1 },
  { patterns: ["saving_note"], stepIndex: 2 },
]

function resolveActiveStepIndex(stage: string | null | undefined, jobType: JobProgressType): number {
  const normalized = stage ?? "queued"
  const mapping =
    jobType === "transcription" ? TRANSCRIPTION_STAGE_TO_STEP : AI_ACTION_STAGE_TO_STEP

  for (const entry of mapping) {
    for (const pattern of entry.patterns) {
      if (stageMatches(normalized, pattern)) {
        return entry.stepIndex
      }
    }
  }

  if (normalized === "completed") {
    const steps =
      jobType === "transcription"
        ? TRANSCRIPTION_PROGRESS_STEPS
        : AI_ACTION_PROGRESS_STEPS
    return steps.length
  }

  return 0
}

export function getProgressSteps(jobType: JobProgressType): ProgressStep[] {
  return jobType === "transcription"
    ? TRANSCRIPTION_PROGRESS_STEPS
    : AI_ACTION_PROGRESS_STEPS
}

export function getActiveStepIndex(job: Job | null, jobType: JobProgressType): number {
  if (!job) return 0
  if (job.status === "completed") {
    return getProgressSteps(jobType).length
  }
  if (job.status === "failed") {
    return resolveActiveStepIndex(job.stage, jobType)
  }
  return resolveActiveStepIndex(job.stage, jobType)
}

export function inferJobProgressType(job: Job | null): JobProgressType {
  if (job?.type === "ai_action") return "ai_action"
  return "transcription"
}
