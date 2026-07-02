import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

const STEP_KEYS = ["howItWorks", "soundCheck", "record", "review"] as const

export type VoiceprintEnrollmentStep = (typeof STEP_KEYS)[number]

type VoiceprintEnrollmentStepperProps = {
  current: VoiceprintEnrollmentStep
}

const STEP_INDEX: Record<VoiceprintEnrollmentStep, number> = {
  howItWorks: 0,
  soundCheck: 1,
  record: 2,
  review: 3,
}

export function VoiceprintEnrollmentStepper({
  current,
}: VoiceprintEnrollmentStepperProps) {
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
            {t(`voiceprints.enrollmentStep.${stepKey}`)}
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
