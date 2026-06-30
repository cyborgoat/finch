import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"
import { useQuery } from "@tanstack/react-query"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { TextShimmer } from "@/components/motion-primitives/text-shimmer"
import { TranscriptDetailLayout } from "@/components/transcripts/TranscriptDetailLayout"
import { TranscriptPageAudio } from "@/components/transcripts/TranscriptPageAudio"
import { Skeleton } from "@/components/ui/skeleton"
import { useDocuments } from "@/hooks/useDocuments"
import { useTranscript } from "@/hooks/useTranscripts"
import { useTranscriptEditor } from "@/hooks/useTranscriptEditor"
import { healthQuery } from "@/lib/queries/health"
import { documentsQuery } from "@/lib/queries/documents"
import { transcriptQuery } from "@/lib/queries/transcripts"
import type { Transcript } from "@/lib/types"

type TranscriptSearch = {
  tab?: "ai"
}

export const Route = createFileRoute("/transcripts/$id/")({
  validateSearch: (search: Record<string, unknown>): TranscriptSearch =>
    search.tab === "ai" ? { tab: "ai" } : {},
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(transcriptQuery(params.id)),
      context.queryClient.ensureQueryData(healthQuery()),
      context.queryClient.ensureQueryData(documentsQuery(params.id)),
    ]),
  component: TranscriptDetailPage,
})

function TranscriptDetailEditor({ transcript }: { transcript: Transcript }) {
  const { data: documentsData } = useDocuments(transcript.id)
  const { data: health } = useQuery(healthQuery())
  const editor = useTranscriptEditor(transcript)
  const llmReady =
    health?.capabilities?.llmMock ||
    health?.capabilities?.openrouterConfigured ||
    true

  return (
    <TranscriptDetailLayout
      transcript={transcript}
      title={editor.title}
      text={editor.text}
      segments={editor.segments}
      profiles={editor.profiles}
      memoryStatus={editor.memoryStatus}
      documents={documentsData?.items ?? []}
      llmReady={llmReady}
      saving={editor.saving}
      speakerSavePending={editor.speakerSavePending}
      deletePending={editor.deletePending}
      onTitleChange={editor.setTitle}
      onTextChange={editor.setText}
      onSegmentSpeakerSave={editor.applySegmentSpeaker}
      onSave={() => void editor.handleSave()}
      onCopy={() => void editor.handleCopy()}
      onExportTxt={editor.exportTxt}
      onExportMd={editor.exportMd}
      onDelete={() => void editor.handleDelete()}
    />
  )
}

function TranscriptDetailPage() {
  const { id } = Route.useParams()
  const { data: transcript, isLoading } = useTranscript(id)

  if (isLoading) {
    return (
      <PageContainer size="detail">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-8 h-10 w-48" />
        <Skeleton className="mt-6 h-96 w-full" />
      </PageContainer>
    )
  }

  if (!transcript) {
    return (
      <PageContainer size="detail">
        <p className="text-muted-foreground">Transcript not found.</p>
      </PageContainer>
    )
  }

  if (transcript.status === "transcribing") {
    return (
      <PageContainer size="detail">
        <PageHeader
          backHref="/transcripts"
          backLabel="Transcripts"
          title={transcript.title}
          description="Transcription is running locally. This page will update when the text is ready."
        />
        <TranscriptPageAudio audioAssetId={transcript.audioAssetId} />
        <div className="surface-card">
          <p className="text-sm font-medium">
            <TextShimmer>Transcribing…</TextShimmer>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            You can leave this page and check the transcripts list. The status will
            update automatically.
          </p>
        </div>
      </PageContainer>
    )
  }

  if (transcript.status === "failed") {
    return (
      <PageContainer size="detail">
        <PageHeader
          backHref="/transcripts"
          backLabel="Transcripts"
          title={transcript.title}
          description="Transcription failed."
        />
        <TranscriptPageAudio audioAssetId={transcript.audioAssetId} />
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="text-sm font-medium text-destructive">Error</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {transcript.errorMessage ??
              "Something went wrong during transcription. Check backend logs and try again."}
          </p>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer size="detail">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <TranscriptDetailEditor key={transcript.id} transcript={transcript} />
      </Suspense>
    </PageContainer>
  )
}
