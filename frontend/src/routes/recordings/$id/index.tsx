import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { FileText } from "lucide-react"
import { JobProgress } from "@/components/jobs/JobProgress"
import { PageContainer } from "@/components/layout/PageContainer"
import { TextShimmer } from "@/components/motion-primitives/text-shimmer"
import { RecordingDetailLayout } from "@/components/transcripts/TranscriptDetailLayout"
import { RecordingPageAudio } from "@/components/transcripts/TranscriptPageAudio"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useNotes } from "@/hooks/useNotes"
import { useJobPolling } from "@/hooks/useJobPolling"
import { useRecording } from "@/hooks/useRecordings"
import { useRecordingEditor } from "@/hooks/useRecordingEditor"
import { useStartTranscriptionFlow } from "@/hooks/useStartTranscriptionFlow"
import { parseRecordingDetailTab, type RecordingDetailTab } from "@/lib/recordingDetailTabs"
import { resolveRecordingKind } from "@/lib/recordings"
import { notesQuery } from "@/lib/queries/notes"
import { healthQuery } from "@/lib/queries/health"
import { recordingQuery } from "@/lib/queries/recordings"
import type { Recording } from "@/lib/types"

type RecordingSearch = {
  tab?: RecordingDetailTab
  noteId?: string
  jobId?: string
}

export const Route = createFileRoute("/recordings/$id/")({
  validateSearch: (search: Record<string, unknown>): RecordingSearch => {
    const tab = parseRecordingDetailTab(search.tab)
    const noteId =
      typeof search.noteId === "string" && search.noteId.trim()
        ? search.noteId.trim()
        : undefined
    const jobId =
      typeof search.jobId === "string" && search.jobId.trim()
        ? search.jobId.trim()
        : undefined

    if (tab === "source") {
      return jobId ? { noteId, jobId } : noteId ? { noteId } : jobId ? { jobId } : {}
    }

    return jobId
      ? noteId
        ? { tab, noteId, jobId }
        : { tab, jobId }
      : noteId
        ? { tab, noteId }
        : { tab }
  },
  loader: async ({ context, params }) => {
    if (resolveRecordingKind(params.id) !== "recording") {
      return { found: false }
    }

    await Promise.all([
      context.queryClient.ensureQueryData(recordingQuery(params.id)),
      context.queryClient.ensureQueryData(healthQuery()),
      context.queryClient.ensureQueryData(notesQuery(params.id)),
    ])
    return { found: true }
  },
  component: RecordingDetailPage,
})

function RecordingDetailEditor({
  recording,
  onRegenerateTranscription,
  isRegenerating,
}: {
  recording: Recording
  onRegenerateTranscription?: () => void | Promise<void>
  isRegenerating?: boolean
}) {
  const { data: notesData } = useNotes(recording.id)
  const { data: health } = useQuery(healthQuery())
  const editor = useRecordingEditor(recording)
  const llmReady = health?.capabilities?.llmConfigured ?? false

  return (
    <RecordingDetailLayout
      recording={recording}
      title={editor.title}
      text={editor.text}
      segments={editor.segments}
      profiles={editor.profiles}
      voiceprintProfilesStatus={editor.voiceprintProfilesStatus}
      notes={notesData?.items ?? []}
      llmReady={llmReady}
      speakerSavePending={editor.speakerSavePending}
      renamePending={editor.renamePending}
      deletePending={editor.deletePending}
      onRename={(nextTitle) => editor.handleRename(nextTitle)}
      onDelete={() => void editor.handleDelete()}
      onSegmentSpeakerSave={editor.applySegmentSpeaker}
      onRegenerateTranscription={onRegenerateTranscription}
      isRegenerating={isRegenerating}
    />
  )
}

function RecordingDetailPage() {
  const { t } = useTranslation()
  const { id } = Route.useParams()
  const { found } = Route.useLoaderData()

  if (!found) {
    return (
      <PageContainer size="wide">
        <p className="text-muted-foreground">{t("recordings.notFound")}</p>
      </PageContainer>
    )
  }

  return <RecordingFileDetail id={id} />
}

function RecordingFileDetail({ id }: { id: string }) {
  const { t } = useTranslation()
  const { jobId } = Route.useSearch()
  const { data: recording, isLoading } = useRecording(id)
  const { startTranscriptionFlow, isStarting } = useStartTranscriptionFlow()
  const { job, error: jobError } = useJobPolling(jobId ?? null, {
    enabled: !!jobId,
  })

  if (isLoading) {
    return (
      <PageContainer size="wide">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-8 h-10 w-48" />
        <Skeleton className="mt-6 h-96 w-full" />
      </PageContainer>
    )
  }

  if (!recording) {
    return (
      <PageContainer size="wide">
        <p className="text-muted-foreground">{t("recordings.notFound")}</p>
      </PageContainer>
    )
  }

  if (recording.status === "pending") {
    return (
      <PageContainer size="wide">
        <RecordingPageAudio audioAssetId={recording.audioAssetId} title={recording.title} />
        <div className="surface-card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
            <FileText className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t("recording.pendingTitle")}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {t("recording.pendingDescription")}
            </p>
          </div>
          <Button
            onClick={() => void startTranscriptionFlow(recording.id)}
            disabled={isStarting}
          >
            {isStarting ? t("common.starting") : t("recording.startTranscription")}
          </Button>
        </div>
      </PageContainer>
    )
  }

  if (recording.status === "transcribing") {
    return (
      <PageContainer size="wide">
        <RecordingPageAudio audioAssetId={recording.audioAssetId} title={recording.title} />
        <div className="surface-card space-y-6">
          <div>
            <p className="text-sm font-medium">
              <TextShimmer>{t("recording.transcribing")}</TextShimmer>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("recording.transcribingHint")}
            </p>
          </div>
          {jobId ? (
            <JobProgress job={job} error={jobError} />
          ) : null}
        </div>
      </PageContainer>
    )
  }

  if (recording.status === "failed") {
    return (
      <PageContainer size="wide">
        <RecordingPageAudio audioAssetId={recording.audioAssetId} title={recording.title} />
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="text-sm font-medium text-destructive">{t("common.error")}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {recording.errorMessage ?? t("recording.failedDefault")}
          </p>
          <Button
            className="mt-4"
            onClick={() => void startTranscriptionFlow(recording.id)}
            disabled={isStarting}
          >
            {isStarting ? t("common.starting") : t("recording.retryTranscription")}
          </Button>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer size="wide">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <RecordingDetailEditor
          key={recording.id}
          recording={recording}
          onRegenerateTranscription={() =>
            startTranscriptionFlow(recording.id, { regenerate: true, navigateToDetail: false })
          }
          isRegenerating={isStarting}
        />
      </Suspense>
    </PageContainer>
  )
}
