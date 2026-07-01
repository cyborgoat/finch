
import { useTranslation } from "react-i18next"
import { Progress } from "@/components/ui/progress"
import type { Job } from "@/lib/types"

const STAGE_KEYS: Record<string, string> = {
  running_diarization: "runningDiarization",
  running_asr: "runningAsr",
  calling_llm: "callingLlm",
  saving_note: "savingNote",
  saving_recording: "savingRecording",
  loading_model: "loadingModel",
  loading_recording: "loadingRecording",
  completed: "completed",
  queued: "queued",
}

function formatStage(
  stage: string | null | undefined,
  t: (key: string) => string,
) {
  if (!stage) return t("jobs.stage.waiting")

  const key = STAGE_KEYS[stage]
  if (key) return t(`jobs.stage.${key}`)

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
  const { t } = useTranslation()

  if (!job && !error) return null

  const progress = Math.round((job?.progress ?? 0) * 100)
  const stage = formatStage(job?.stage, t)

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{stage}</span>
        <span className="text-muted-foreground">{progress}%</span>
      </div>
      <Progress value={progress} />
      {job?.status === "failed" && (
        <p className="text-sm text-destructive">
          {job.error ?? t("jobs.failedDefault")}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
