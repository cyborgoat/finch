"use client"

import { use, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { LinkedDocumentList } from "@/components/documents/DocumentList"
import { AiActionPanel } from "@/components/transcripts/AiActionPanel"
import { TranscriptEditor } from "@/components/transcripts/TranscriptEditor"
import { TranscriptToolbar } from "@/components/transcripts/TranscriptToolbar"
import { SpeakerConsentDialog } from "@/components/speakers/SpeakerConsentDialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useDocuments } from "@/hooks/useDocuments"
import {
  useDeleteTranscript,
  useTranscript,
  useUpdateTranscript,
} from "@/hooks/useTranscripts"
import {
  useRecordSpeakerConsent,
  useSpeakerMemoryStatus,
  useSpeakerProfiles,
} from "@/hooks/useSpeakerProfiles"
import { exportTranscriptMd, exportTranscriptTxt } from "@/lib/export"
import { updateTranscriptSpeakers, FinchApiError } from "@/lib/api"
import {
  resolveSpeakerSegments,
  transcriptDisplayText,
  formatSpeakerTranscript,
} from "@/lib/transcriptFormat"
import {
  buildSpeakerMappings,
  createSpeakerDraft,
  hasSpeakerDraftChanges,
  uniqueSpeakerClusters,
} from "@/lib/speakerMappings"
import type { SpeakerSegment, Transcript } from "@/lib/types"

function TranscriptDetailEditor({ transcript }: { transcript: Transcript }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const updateMutation = useUpdateTranscript(transcript.id)
  const deleteMutation = useDeleteTranscript()
  const { data: documentsData } = useDocuments(transcript.id)
  const { data: memoryStatus } = useSpeakerMemoryStatus()
  const { data: profilesData } = useSpeakerProfiles()
  const consentMutation = useRecordSpeakerConsent()

  const initialSegments = resolveSpeakerSegments(transcript)
  const initialClusters = useMemo(
    () => uniqueSpeakerClusters(initialSegments),
    [initialSegments],
  )

  const [title, setTitle] = useState(transcript.title)
  const [segments, setSegments] = useState(initialSegments)
  const [speakerDraft, setSpeakerDraft] = useState(() =>
    createSpeakerDraft(initialClusters),
  )
  const [text, setText] = useState(() =>
    transcriptDisplayText(
      transcript.rawText,
      transcript.editedText,
      initialSegments,
    ),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)

  const clusters = useMemo(() => uniqueSpeakerClusters(segments), [segments])
  const speakerChanges = hasSpeakerDraftChanges(clusters, speakerDraft)
  const wantsEnroll = Object.values(speakerDraft.enroll).some(Boolean)

  const applySpeakerUpdate = (updatedSegments: SpeakerSegment[], rawText: string) => {
    setSegments(updatedSegments)
    const formatted = formatSpeakerTranscript(updatedSegments) || rawText
    setText(formatted)
    setSpeakerDraft(createSpeakerDraft(uniqueSpeakerClusters(updatedSegments)))
    void queryClient.invalidateQueries({ queryKey: ["transcripts", transcript.id] })
    void queryClient.invalidateQueries({ queryKey: ["speaker-profiles"] })
  }

  const performSave = async () => {
    setIsSaving(true)
    try {
      let savedText = text

      if (speakerChanges && segments.length > 0) {
        const mappings = buildSpeakerMappings(
          clusters,
          speakerDraft,
          profilesData?.items ?? [],
        )
        const result = await updateTranscriptSpeakers(transcript.id, mappings)
        const updatedSegments = result.speakerSegments ?? []
        savedText = formatSpeakerTranscript(updatedSegments) || result.rawText
        applySpeakerUpdate(updatedSegments, result.rawText)
      } else if (segments.length > 0) {
        savedText =
          formatSpeakerTranscript(
            segments.map((segment) => {
              const clusterId = segment.clusterId || segment.speaker
              return {
                ...segment,
                speaker: speakerDraft.names[clusterId] ?? segment.speaker,
              }
            }),
          ) || text
      }

      await updateMutation.mutateAsync({ title, editedText: savedText })
      setText(savedText)
      toast.success("Transcript saved")
    } catch (error) {
      const message =
        error instanceof FinchApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to save"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = async () => {
    if (wantsEnroll && !memoryStatus?.consentGiven) {
      setConsentOpen(true)
      return
    }
    await performSave()
  }

  const handleConsent = async () => {
    try {
      await consentMutation.mutateAsync()
      setConsentOpen(false)
      await performSave()
    } catch {
      toast.error("Failed to record consent")
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

  const saving = isSaving || updateMutation.isPending

  return (
    <div className="space-y-6">
      <TranscriptToolbar
        onSave={() => void handleSave()}
        onCopy={() => void handleCopy()}
        onExportTxt={() => exportTranscriptTxt(title, text)}
        onExportMd={() => exportTranscriptMd(title, text)}
        onDelete={() => void handleDelete()}
        isSaving={saving}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <TranscriptEditor
          title={title}
          text={text}
          speakerSegments={segments}
          speakerClusters={clusters}
          speakerDraft={speakerDraft}
          processingNote={transcript.processingNote}
          onTitleChange={setTitle}
          onTextChange={setText}
          onSpeakerDraftChange={setSpeakerDraft}
          disabled={saving}
        />
        <div className="space-y-4">
          <AiActionPanel transcriptId={transcript.id} disabled={saving} />
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Generated documents</h2>
            <LinkedDocumentList items={documentsData?.items ?? []} />
          </section>
        </div>
      </div>

      <SpeakerConsentDialog
        open={consentOpen}
        onOpenChange={setConsentOpen}
        onConfirm={() => void handleConsent()}
        isPending={consentMutation.isPending || saving}
      />
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
          <p className="text-sm text-destructive">Transcription failed</p>
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

  return <TranscriptDetailEditor key={transcript.id} transcript={transcript} />
}
