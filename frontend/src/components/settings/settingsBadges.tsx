import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"

export function SettingsWarningBadge({ children }: { children: ReactNode }) {
  return (
    <Badge variant="outline" className="border-destructive text-destructive">
      {children}
    </Badge>
  )
}
