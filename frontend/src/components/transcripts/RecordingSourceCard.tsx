import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type RecordingSourceCardProps = {
  audio: ReactNode
  children: ReactNode
  bodyClassName?: string
}

export function RecordingSourceCard({
  audio,
  children,
  bodyClassName,
}: RecordingSourceCardProps) {
  return (
    <div className="surface-card overflow-hidden p-0">
      <div className="p-4 sm:p-6">{audio}</div>
      <div className={cn("surface-divider", bodyClassName)}>{children}</div>
    </div>
  )
}
