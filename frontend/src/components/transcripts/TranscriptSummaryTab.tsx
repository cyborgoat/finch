import { Link } from "@tanstack/react-router"
import { useCallback, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Sparkles } from "lucide-react"
import { BlurFade } from "@/components/motion-primitives/blur-fade"
import { EmptyState } from "@/components/effects/EmptyState"
import { MarkdownPreview } from "@/components/documents/MarkdownPreview"
import { JobProgress } from "@/components/jobs/JobProgress"
import { Section } from "@/components/layout/Section"
import { Button } from "@/components/ui/button"
import { useDocument } from "@/hooks/useDocuments"
import { useJobPolling } from "@/hooks/useJobPolling"
import { useUserPreferences } from "@/hooks/useUserPreferences"
import { createTranscriptSummary } from "@/lib/api"
import type { DocumentSummary } from "@/lib/types"

type TranscriptSummaryTabProps = {
  transcriptId: string
  documents: DocumentSummary[]
  llmReady?: boolean
}

function preferenceSummary(language: string, style: string, format: string): string {
  const languageLabel = language === "zh" ? "中文" : "English"
  const styleLabel =
    style === "concise" ? "concise" : style === "detailed" ? "detailed" : "balanced"
  const formatLabel = format === "bullets" ? "bullet points" : "paragraphs"
  return `${languageLabel}, ${styleLabel}, ${formatLabel}`
}

export function TranscriptSummaryTab({
  transcriptId,
  documents,
  llmReady = true,
}: TranscriptSummaryTabProps) {
  const queryClient = useQueryClient()
  const { preferences, ready: prefsReady } = useUserPreferences()
  const [jobId, setJobId] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  const summarySummary = useMemo(
    () =>
      documents
        .filter((document) => document.type === "markdown_summary")
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null,
    [documents],
  )

  const { data: summaryDocument, isLoading: summaryLoading } = useDocument(
    summarySummary?.id ?? "",
  )

  const summaryMarkdown = summaryDocument?.markdown ?? null

  const invalidateSummary = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["documents", transcriptId] })
    void queryClient.invalidateQueries({ queryKey: ["documents"] })
    void queryClient.invalidateQueries({ queryKey: ["files"] })
    if (summarySummary?.id) {
      void queryClient.invalidateQueries({ queryKey: ["documents", summarySummary.id] })
    }
  }, [queryClient, summarySummary?.id, transcriptId])

  const onCompleted = useCallback(
    (resultId: string | null | undefined) => {
      setIsStarting(false)
      setJobId(null)
      invalidateSummary()
      if (resultId) {
        void queryClient.invalidateQueries({ queryKey: ["documents", resultId] })
      }
      toast.success("Summary generated")
    },
    [invalidateSummary, queryClient],
  )

  const { job, error } = useJobPolling(jobId, {
    enabled: !!jobId,
    onCompleted: (nextJob) => onCompleted(nextJob.resultId),
    onFailed: (nextJob) => {
      setIsStarting(false)
      setJobId(null)
      toast.error(nextJob.error ?? "Summary generation failed")
    },
  })

  const handleGenerate = async () => {
    setIsStarting(true)
    try {
      const { jobId: newJobId } = await createTranscriptSummary({
        transcriptId,
        source: "editedText",
      })
      setJobId(newJobId)
    } catch (err) {
      setIsStarting(false)
      toast.error(err instanceof Error ? err.message : "Failed to start summary")
    }
  }

  const busy = isStarting || !!jobId
  const hasSummary = !!summaryMarkdown?.trim()
  const prefsLabel = prefsReady
    ? preferenceSummary(
        preferences.language,
        preferences.summaryStyle,
        preferences.summaryFormat,
      )
    : null

  return (
    <BlurFade className="section-stack">
      {!llmReady ? (
        <div className="surface-card text-sm text-muted-foreground">
          Summaries require an LLM provider. Configure{" "}
          <Link to="/settings" className="underline underline-offset-2">
            Settings → LLM provider
          </Link>
          .
        </div>
      ) : null}

      <Section
        title="Summary"
        description={
          prefsLabel
            ? `Generated from the transcript using your preferences (${prefsLabel}). Change them in Settings.`
            : "Generate an LLM overview of this recording from the transcript text."
        }
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={!llmReady || busy}
          >
            <Sparkles className="size-4" />
            {hasSummary ? "Regenerate summary" : "Generate summary"}
          </Button>
        </div>
      </Section>

      {busy ? (
        <Section title="In progress">
          <JobProgress job={job} error={error} />
        </Section>
      ) : null}

      {summaryLoading && summarySummary ? (
        <p className="section-hint">Loading summary…</p>
      ) : hasSummary ? (
        <Section title={summaryDocument?.title ?? "Summary"}>
          <MarkdownPreview markdown={summaryMarkdown} />
        </Section>
      ) : !busy ? (
        <EmptyState
          title="No summary yet"
          description="Generate a summary to see key points, topics, and takeaways from this recording."
        />
      ) : null}
    </BlurFade>
  )
}
