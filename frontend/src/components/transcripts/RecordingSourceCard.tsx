import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type RecordingSourceCardProps = {
  audio: ReactNode
  children?: ReactNode
  bodyClassName?: string
  audioClassName?: string
  className?: string
}

export function RecordingSourceCard({
  audio,
  children,
  bodyClassName,
  audioClassName,
  className,
}: RecordingSourceCardProps) {
  return (
    <div className={cn("surface-card overflow-hidden p-0", className)}>
      <div className={cn("p-4 sm:p-6", audioClassName)}>{audio}</div>
      {children ? (
        <div className={cn("surface-divider", bodyClassName)}>{children}</div>
      ) : null}
    </div>
  )
}
