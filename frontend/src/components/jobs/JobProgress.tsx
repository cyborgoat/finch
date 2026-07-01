
import { Progress } from "@/components/ui/progress"
import type { Job } from "@/lib/types"

const STAGE_LABELS: Record<string, string> = {
  running_diarization: "Identifying speakers",
  running_asr: "Transcribing audio",
  calling_llm: "Generating summary",
  saving_document: "Saving summary",
  saving_transcript: "Saving transcript",
  loading_model: "Loading model",
  loading_transcript: "Loading transcript",
  completed: "Completed",
  queued: "Queued",
}

function formatStage(stage: string | null | undefined) {
  if (!stage) return "Waiting"
  if (STAGE_LABELS[stage]) return STAGE_LABELS[stage]

  if (stage.startsWith("running_asr_chunk_") || stage.startsWith("running_asr_segment_")) {
    return stage.replaceAll("_", " ")
  }

  return stage.replaceAll("_", " ")
}

type JobProgressProps = {
  job: Job | null
  error?: string | null
}

export function JobProgress({ job, error }: JobProgressProps) {
  if (!job && !error) return null

  const progress = Math.round((job?.progress ?? 0) * 100)
  const stage = formatStage(job?.stage)

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{stage}</span>
        <span className="text-muted-foreground">{progress}%</span>
      </div>
      <Progress value={progress} />
      {job?.status === "failed" && (
        <p className="text-sm text-destructive">
          {job.error ?? "Job failed. Restart the backend and try again."}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
