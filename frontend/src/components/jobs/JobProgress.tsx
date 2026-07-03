
import { CompactJobProgress } from "@/components/jobs/CompactJobProgress"
import {
  inferJobProgressType,
  type JobProgressType,
} from "@/components/jobs/jobProgressSteps"
import type { Job } from "@/lib/types"

type JobProgressProps = {
  job: Job | null
  error?: string | null
  jobType?: JobProgressType
}

export function JobProgress({ job, error, jobType }: JobProgressProps) {
  return (
    <CompactJobProgress
      job={job}
      jobType={jobType ?? inferJobProgressType(job)}
      error={error}
    />
  )
}
