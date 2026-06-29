"use client"

import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { getHealth } from "@/lib/api"

export function Topbar() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    refetchInterval: 30_000,
  })

  const status = isLoading ? "checking" : isError ? "offline" : "online"

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <p className="text-sm text-muted-foreground">
        Audio stays local. Transcripts first.
      </p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Backend</span>
        <Badge
          variant={
            status === "online"
              ? "default"
              : status === "checking"
                ? "secondary"
                : "destructive"
          }
        >
          {status === "online"
            ? data?.app ?? "Finch"
            : status === "checking"
              ? "Checking…"
              : "Offline"}
        </Badge>
      </div>
    </header>
  )
}
