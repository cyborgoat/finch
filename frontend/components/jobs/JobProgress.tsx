"use client"

import { Progress } from "@/components/ui/progress"
import type { Job } from "@/lib/types"

type JobProgressProps = {
  job: Job | null
  error?: string | null
}

export function JobProgress({ job, error }: JobProgressProps) {
  if (!job && !error) return null

  const progress = Math.round((job?.progress ?? 0) * 100)
  const stage = job?.stage?.replaceAll("_", " ") ?? "waiting"

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium capitalize">{stage}</span>
        <span className="text-muted-foreground">{progress}%</span>
      </div>
      <Progress value={progress} />
      {job?.status === "failed" && (
        <p className="text-sm text-destructive">
          {job.error ?? "Transcription failed. Restart the backend and try again."}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
