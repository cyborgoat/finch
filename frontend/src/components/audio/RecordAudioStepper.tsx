import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

const STEP_KEYS = ["record", "save"] as const

export type RecordAudioStep = (typeof STEP_KEYS)[number]

type RecordAudioStepperProps = {
  current: RecordAudioStep
}

const STEP_INDEX: Record<RecordAudioStep, number> = {
  record: 0,
  save: 1,
}

export function RecordAudioStepper({ current }: RecordAudioStepperProps) {
  const { t } = useTranslation()
  const currentIndex = STEP_INDEX[current]

  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {STEP_KEYS.map((stepKey, index) => (
        <li key={stepKey} className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-full border text-xs font-medium",
              index <= currentIndex
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            {index + 1}
          </span>
          <span
            className={cn(
              index <= currentIndex ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {t(`record.step.${stepKey}`)}
          </span>
          {index < STEP_KEYS.length - 1 ? (
            <span className="mx-1 text-muted-foreground" aria-hidden>
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  )
}
