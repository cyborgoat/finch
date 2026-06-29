"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { JobProgress } from "@/components/jobs/JobProgress"
import { useAiActionTemplates } from "@/hooks/useAiActions"
import { useJobPolling } from "@/hooks/useJobPolling"
import { createAiActionJob } from "@/lib/api"

type AiActionPanelProps = {
  transcriptId: string
  disabled?: boolean
}

export function AiActionPanel({ transcriptId, disabled }: AiActionPanelProps) {
  const router = useRouter()
  const { data, isLoading } = useAiActionTemplates()
  const [jobId, setJobId] = useState<string | null>(null)
  const [runningAction, setRunningAction] = useState<string | null>(null)

  const onCompleted = useCallback(
    (resultId: string | null | undefined) => {
      setRunningAction(null)
      setJobId(null)
      if (resultId) {
        toast.success("Document generated")
        router.push(`/documents/${resultId}`)
      }
    },
    [router],
  )

  const { job, error } = useJobPolling(jobId, {
    enabled: !!jobId,
    onCompleted: (j) => onCompleted(j.resultId),
    onFailed: (j) => {
      setRunningAction(null)
      toast.error(j.error ?? "AI action failed")
    },
  })

  const handleRun = async (actionId: string) => {
    setRunningAction(actionId)
    try {
      const { jobId: newJobId } = await createAiActionJob({
        transcriptId,
        action: actionId,
        source: "editedText",
      })
      setJobId(newJobId)
      toast.message("AI action started")
    } catch (err) {
      setRunningAction(null)
      toast.error(err instanceof Error ? err.message : "Failed to start AI action")
    }
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-base">AI Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Generate Markdown from this transcript via OpenRouter. Only transcript text
          is sent—not audio.
        </p>
        {isLoading ? (
          <p className="text-muted-foreground">Loading actions…</p>
        ) : (
          <ul className="space-y-2">
            {(data?.items ?? []).map((action) => (
              <li key={action.id}>
                <Button
                  variant="outline"
                  className="h-auto w-full justify-start whitespace-normal py-2 text-left"
                  disabled={disabled || !!jobId}
                  onClick={() => void handleRun(action.id)}
                >
                  <span>
                    <span className="block font-medium">{action.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {action.description}
                    </span>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        )}
        {runningAction && <JobProgress job={job} error={error} />}
      </CardContent>
    </Card>
  )
}
