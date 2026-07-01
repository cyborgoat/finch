import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Suspense } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { MdxNoteEditor } from "@/components/documents/MdxNoteEditor"
import { DocumentToolbar } from "@/components/documents/DocumentToolbar"
import { PageContainer } from "@/components/layout/PageContainer"
import { BlurFade } from "@/components/motion-primitives/blur-fade"
import { TextShimmer } from "@/components/motion-primitives/text-shimmer"
import { TranscriptDetailLayout } from "@/components/transcripts/TranscriptDetailLayout"
import { TranscriptPageAudio } from "@/components/transcripts/TranscriptPageAudio"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useDeleteDocument,
  useDocument,
  useDocuments,
} from "@/hooks/useDocuments"
import { useTranscript } from "@/hooks/useTranscripts"
import { useTranscriptEditor } from "@/hooks/useTranscriptEditor"
import { parseFileDetailTab, type FileDetailTab } from "@/lib/fileDetailTabs"
import { resolveFileKind } from "@/lib/files"
import { exportDocumentMd } from "@/lib/export"
import { documentQuery, documentsQuery } from "@/lib/queries/documents"
import { healthQuery } from "@/lib/queries/health"
import { transcriptQuery } from "@/lib/queries/transcripts"
import type { Document, Transcript } from "@/lib/types"

type FileSearch = {
  tab?: FileDetailTab
  noteId?: string
}

export const Route = createFileRoute("/files/$id/")({
  validateSearch: (search: Record<string, unknown>): FileSearch => {
    const tab = parseFileDetailTab(search.tab)
    const noteId =
      typeof search.noteId === "string" && search.noteId.trim()
        ? search.noteId.trim()
        : undefined

    if (tab === "source") {
      return noteId ? { noteId } : {}
    }

    return noteId ? { tab, noteId } : { tab }
  },
  loader: async ({ context, params }) => {
    const kind = resolveFileKind(params.id)
    if (kind === "document") {
      await context.queryClient.ensureQueryData(documentQuery(params.id))
    } else if (kind === "transcript") {
      await Promise.all([
        context.queryClient.ensureQueryData(transcriptQuery(params.id)),
        context.queryClient.ensureQueryData(healthQuery()),
        context.queryClient.ensureQueryData(documentsQuery(params.id)),
      ])
    }
    return { kind }
  },
  component: FileDetailPage,
})

function TranscriptDetailEditor({ transcript }: { transcript: Transcript }) {
  const { data: documentsData } = useDocuments(transcript.id)
  const { data: health } = useQuery(healthQuery())
  const editor = useTranscriptEditor(transcript)
  const llmReady = health?.capabilities?.llmConfigured ?? false

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
      speakerSavePending={editor.speakerSavePending}
      renamePending={editor.renamePending}
      deletePending={editor.deletePending}
      onRename={(nextTitle) => editor.handleRename(nextTitle)}
      onDelete={() => void editor.handleDelete()}
      onSegmentSpeakerSave={editor.applySegmentSpeaker}
    />
  )
}

function DocumentDetailEditor({ document }: { document: Document }) {
  const navigate = useNavigate()
  const deleteMutation = useDeleteDocument()

  const handleCopy = async () => {
    await navigator.clipboard.writeText(document.markdown)
    toast.success("Copied to clipboard")
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(document.id)
      toast.success("Document deleted")
      void navigate({ to: "/files" })
    } catch {
      toast.error("Failed to delete")
    }
  }

  return (
    <BlurFade className="section-stack">
      <DocumentToolbar
        onCopy={() => void handleCopy()}
        onExport={() => exportDocumentMd(document.title, document.markdown)}
        onDelete={() => void handleDelete()}
        isDeleting={deleteMutation.isPending}
      />
      <MdxNoteEditor document={document} />
    </BlurFade>
  )
}

function FileDetailPage() {
  const { id } = Route.useParams()
  const { kind } = Route.useLoaderData()

  if (kind === "document") {
    return <DocumentFileDetail id={id} />
  }

  if (kind === "transcript") {
    return <TranscriptFileDetail id={id} />
  }

  return (
    <PageContainer size="wide">
      <p className="text-muted-foreground">File not found.</p>
    </PageContainer>
  )
}

function DocumentFileDetail({ id }: { id: string }) {
  const { data: document, isLoading } = useDocument(id)

  if (isLoading) {
    return (
      <PageContainer size="wide">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-8 h-96 w-full" />
      </PageContainer>
    )
  }

  if (!document) {
    return (
      <PageContainer size="wide">
        <p className="text-muted-foreground">File not found.</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer size="wide">
      <DocumentDetailEditor
        key={`${document.id}-${document.updatedAt}`}
        document={document}
      />
    </PageContainer>
  )
}

function TranscriptFileDetail({ id }: { id: string }) {
  const { data: transcript, isLoading } = useTranscript(id)

  if (isLoading) {
    return (
      <PageContainer size="wide">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-8 h-10 w-48" />
        <Skeleton className="mt-6 h-96 w-full" />
      </PageContainer>
    )
  }

  if (!transcript) {
    return (
      <PageContainer size="wide">
        <p className="text-muted-foreground">File not found.</p>
      </PageContainer>
    )
  }

  if (transcript.status === "transcribing") {
    return (
      <PageContainer size="wide">
        <TranscriptPageAudio audioAssetId={transcript.audioAssetId} />
        <div className="surface-card">
          <p className="text-sm font-medium">
            <TextShimmer>Transcribing…</TextShimmer>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            You can leave this page and check the files list. The status will
            update automatically.
          </p>
        </div>
      </PageContainer>
    )
  }

  if (transcript.status === "failed") {
    return (
      <PageContainer size="wide">
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
    <PageContainer size="wide">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <TranscriptDetailEditor key={transcript.id} transcript={transcript} />
      </Suspense>
    </PageContainer>
  )
}
