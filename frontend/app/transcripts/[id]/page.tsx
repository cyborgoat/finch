"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LinkedDocumentList } from "@/components/documents/DocumentList"
import { AiActionPanel } from "@/components/transcripts/AiActionPanel"
import { TranscriptEditor } from "@/components/transcripts/TranscriptEditor"
import { TranscriptToolbar } from "@/components/transcripts/TranscriptToolbar"
import { Skeleton } from "@/components/ui/skeleton"
import { useDocuments } from "@/hooks/useDocuments"
import {
  useDeleteTranscript,
  useTranscript,
  useUpdateTranscript,
} from "@/hooks/useTranscripts"
import { exportTranscriptMd, exportTranscriptTxt } from "@/lib/export"
import {
  resolveSpeakerSegments,
  transcriptDisplayText,
} from "@/lib/transcriptFormat"
import type { Transcript } from "@/lib/types"

function TranscriptDetailEditor({ transcript }: { transcript: Transcript }) {
  const router = useRouter()
  const updateMutation = useUpdateTranscript(transcript.id)
  const deleteMutation = useDeleteTranscript()
  const { data: documentsData } = useDocuments(transcript.id)

  const speakerSegments = resolveSpeakerSegments(transcript)
  const [title, setTitle] = useState(transcript.title)
  const [text, setText] = useState(() =>
    transcriptDisplayText(
      transcript.rawText,
      transcript.editedText,
      speakerSegments,
    ),
  )

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ title, editedText: text })
      toast.success("Transcript saved")
    } catch {
      toast.error("Failed to save")
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  const handleDelete = async () => {
    if (!confirm("Delete this transcript?")) return
    try {
      await deleteMutation.mutateAsync(transcript.id)
      toast.success("Transcript deleted")
      router.push("/transcripts")
    } catch {
      toast.error("Failed to delete")
    }
  }

  return (
    <div className="space-y-6">
      <TranscriptToolbar
        onSave={() => void handleSave()}
        onCopy={() => void handleCopy()}
        onExportTxt={() => exportTranscriptTxt(title, text)}
        onExportMd={() => exportTranscriptMd(title, text)}
        onDelete={() => void handleDelete()}
        isSaving={updateMutation.isPending}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <TranscriptEditor
          title={title}
          text={text}
          speakerSegments={speakerSegments}
          processingNote={transcript.processingNote}
          onTitleChange={setTitle}
          onTextChange={setText}
          disabled={updateMutation.isPending}
        />
        <div className="space-y-4">
          <AiActionPanel
            transcriptId={transcript.id}
            disabled={updateMutation.isPending}
          />
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Generated documents</h2>
            <LinkedDocumentList items={documentsData?.items ?? []} />
          </section>
        </div>
      </div>
    </div>
  )
}

export default function TranscriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: transcript, isLoading } = useTranscript(id)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!transcript) {
    return <p className="text-muted-foreground">Transcript not found.</p>
  }

  if (transcript.status === "transcribing") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{transcript.title}</h1>
          <p className="text-sm text-muted-foreground">
            Transcription is running locally. This page will update when the text
            is ready.
          </p>
        </div>
        <div className="rounded-lg border border-primary/30 bg-muted/20 p-6">
          <p className="text-sm font-medium">Transcribing…</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You can leave this page and check the transcripts list. The status
            will update automatically.
          </p>
        </div>
      </div>
    )
  }

  if (transcript.status === "failed") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{transcript.title}</h1>
          <p className="text-sm text-destructive">
            Transcription failed
          </p>
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
          <p className="text-sm font-medium">Error</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {transcript.errorMessage ??
              "Something went wrong during transcription. Check backend logs and try again."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <TranscriptDetailEditor
      key={`${transcript.id}-${transcript.updatedAt}`}
      transcript={transcript}
    />
  )
}
