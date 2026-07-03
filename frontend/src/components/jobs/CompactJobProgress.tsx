import { Check, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import type { Job } from "@/lib/types"
import {
  getActiveStepIndex,
  getProgressSteps,
  type JobProgressType,
} from "@/components/jobs/jobProgressSteps"

type CompactJobProgressProps = {
  job: Job | null
  jobType?: JobProgressType
  error?: string | null
  className?: string
}

const RING_SIZE = 72
const STROKE = 5
const RADIUS = (RING_SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function CompactJobProgress({
  job,
  jobType = "transcription",
  error,
  className,
}: CompactJobProgressProps) {
  const { t } = useTranslation()
  const steps = getProgressSteps(jobType)
  const activeIndex = getActiveStepIndex(job, jobType)
  const progress = Math.round((job?.progress ?? 0) * 100)
  const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-5">
        <div
          className="relative shrink-0"
          style={{ width: RING_SIZE, height: RING_SIZE }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            className="-rotate-90"
          >
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              className="stroke-muted"
              strokeWidth={STROKE}
            />
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              className="stroke-primary transition-all duration-300"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-medium tabular-nums">
            {progress}%
          </span>
        </div>

        <ul className="min-w-0 flex-1 space-y-2">
          {steps.map((step, index) => {
            const isComplete = index < activeIndex
            const isActive = index === activeIndex && job?.status !== "completed"
            const isFailed = job?.status === "failed" && isActive

            return (
              <li
                key={step.id}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  isComplete && "text-muted-foreground",
                  isActive && !isFailed && "font-medium text-foreground",
                  isActive && isFailed && "font-medium text-destructive",
                  !isComplete && !isActive && "text-muted-foreground/60",
                )}
              >
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {isComplete ? (
                    <Check className="size-3.5 text-primary" aria-hidden />
                  ) : isActive ? (
                    <Loader2
                      className={cn(
                        "size-3.5 animate-spin",
                        isFailed ? "text-destructive" : "text-primary",
                      )}
                      aria-hidden
                    />
                  ) : (
                    <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                  )}
                </span>
                <span className="truncate">{t(step.labelKey)}</span>
              </li>
            )
          })}
        </ul>
      </div>

      {job?.status === "failed" && (
        <p className="text-sm text-destructive">
          {job.error ?? t("jobs.failedDefault")}
        </p>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
