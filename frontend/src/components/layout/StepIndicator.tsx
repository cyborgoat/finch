import { cn } from "@/lib/utils"

type StepIndicatorProps<T extends string> = {
  steps: readonly T[]
  current: T
  label: (step: T) => string
}

export function StepIndicator<T extends string>({
  steps,
  current,
  label,
}: StepIndicatorProps<T>) {
  const currentIndex = steps.indexOf(current)

  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {steps.map((step, index) => (
        <li key={step} className="flex items-center gap-2">
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
            {label(step)}
          </span>
          {index < steps.length - 1 ? (
            <span className="mx-1 text-muted-foreground" aria-hidden>
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  )
}
