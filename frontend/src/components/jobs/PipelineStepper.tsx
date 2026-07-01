import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

const STEP_KEYS = ["upload", "transcribe", "done"] as const

type PipelineStepperProps = {
  current: 0 | 1 | 2
}

export function PipelineStepper({ current }: PipelineStepperProps) {
  const { t } = useTranslation()

  return (
    <ol className="flex items-center gap-2 text-sm">
      {STEP_KEYS.map((stepKey, index) => (
        <li key={stepKey} className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium",
              index <= current
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            {index + 1}
          </span>
          <span
            className={cn(
              index <= current ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {t(`jobs.step.${stepKey}`)}
          </span>
          {index < STEP_KEYS.length - 1 && (
            <span className="mx-1 text-muted-foreground">→</span>
          )}
        </li>
      ))}
    </ol>
  )
}
