import { Link } from "@tanstack/react-router"
import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  FileText,
  ListChecks,
  MessageSquareText,
  Sparkles,
  StickyNote,
} from "lucide-react"
import { BlurFade } from "@/components/motion-primitives/blur-fade"
import { EmptyState } from "@/components/effects/EmptyState"
import { LinkedDocumentList } from "@/components/documents/DocumentList"
import { JobProgress } from "@/components/jobs/JobProgress"
import { Section } from "@/components/layout/Section"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useAiActionTemplates } from "@/hooks/useAiActions"
import { useJobPolling } from "@/hooks/useJobPolling"
import { createAiActionJob } from "@/lib/api"
import type { DocumentSummary } from "@/lib/types"

const ACTION_ICONS: Record<string, React.ReactNode> = {
  markdown_summary: <StickyNote className="size-4" />,
  action_items: <ListChecks className="size-4" />,
  meeting_notes: <MessageSquareText className="size-4" />,
  clean_transcript: <FileText className="size-4" />,
  study_notes: <Sparkles className="size-4" />,
}

type TranscriptAiTabProps = {
  transcriptId: string
  documents: DocumentSummary[]
  llmReady?: boolean
}

export function TranscriptAiTab({
  transcriptId,
  documents,
  llmReady = true,
}: TranscriptAiTabProps) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useAiActionTemplates()
  const [jobId, setJobId] = useState<string | null>(null)
  const [runningAction, setRunningAction] = useState<string | null>(null)
  const [lastDocumentId, setLastDocumentId] = useState<string | null>(null)

  const onCompleted = useCallback(
    (resultId: string | null | undefined) => {
      setRunningAction(null)
      setJobId(null)
      void queryClient.invalidateQueries({ queryKey: ["documents", transcriptId] })
      void queryClient.invalidateQueries({ queryKey: ["documents"] })
      if (resultId) {
        setLastDocumentId(resultId)
        toast.success("Document generated")
      }
    },
    [queryClient, transcriptId],
  )

  const { job, error } = useJobPolling(jobId, {
    enabled: !!jobId,
    onCompleted: (j) => onCompleted(j.resultId),
    onFailed: (j) => {
      setRunningAction(null)
      setJobId(null)
      toast.error(j.error ?? "AI action failed")
    },
  })

  const handleRun = async (actionId: string) => {
    setRunningAction(actionId)
    setLastDocumentId(null)
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

  const templates = data?.items ?? []

  return (
    <BlurFade className="section-stack max-w-3xl">
      {!llmReady ? (
        <div className="surface-card text-sm text-muted-foreground">
          LLM actions are not configured. Set{" "}
          <code className="text-xs">OPENROUTER_API_KEY</code> or enable mock mode in{" "}
          <Link to="/settings" className="text-foreground underline-offset-4 hover:underline">
            Settings
          </Link>
          .
        </div>
      ) : null}

      <Section
        title="AI actions"
        description="Create Markdown documents from this transcript via OpenRouter. Only transcript text is sent—not audio."
      >
        {isLoading ? (
          <p className="section-hint">Loading actions…</p>
        ) : !llmReady ? (
          <p className="section-hint">Configure LLM access in Settings to run AI actions.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((action) => (
              <Card
                key={action.id}
                className="transition-colors hover:bg-muted/30"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    {ACTION_ICONS[action.id] ?? <Sparkles className="size-4" />}
                    {action.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {action.description}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={!!jobId && runningAction !== action.id}
                    onClick={() => void handleRun(action.id)}
                  >
                    {runningAction === action.id ? "Running…" : "Run"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Section>

      {runningAction && (
        <Section title="In progress">
          <JobProgress job={job} error={error} />
          {lastDocumentId ? (
            <Link
              to="/documents/$id"
              params={{ id: lastDocumentId }}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              View document
            </Link>
          ) : null}
        </Section>
      )}

      <Section
        title="Documents"
        description="Markdown documents generated from this transcript."
      >
        {documents.length === 0 ? (
          <EmptyState
            title="No documents yet"
            description="Run an AI action above to generate a document from this transcript."
          />
        ) : (
          <LinkedDocumentList items={documents} />
        )}
      </Section>
    </BlurFade>
  )
}
