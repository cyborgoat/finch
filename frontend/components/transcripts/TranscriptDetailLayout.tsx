"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BlurFade } from "@/components/motion-primitives/blur-fade"
import { PageHeader } from "@/components/layout/PageHeader"
import { TranscriptAiTab } from "@/components/transcripts/TranscriptAiTab"
import { TranscriptEditor } from "@/components/transcripts/TranscriptEditor"
import { TranscriptToolbar } from "@/components/transcripts/TranscriptToolbar"
import type { DocumentSummary, SpeakerMemoryStatus, SpeakerProfileSummary, Transcript } from "@/lib/types"
import type { SpeakerSegment } from "@/lib/types"

type TranscriptDetailLayoutProps = {
  transcript: Transcript
  title: string
  text: string
  segments: SpeakerSegment[]
  profiles: SpeakerProfileSummary[]
  memoryStatus?: SpeakerMemoryStatus
  documents: DocumentSummary[]
  llmReady?: boolean
  saving: boolean
  speakerSavePending: boolean
  deletePending: boolean
  onTitleChange: (value: string) => void
  onTextChange: (value: string) => void
  onSegmentSpeakerSave: (
    clusterId: string,
    segment: SpeakerSegment,
    payload: { displayName: string; profileId?: string },
  ) => Promise<void>
  onSave: () => void
  onCopy: () => void
  onExportTxt: () => void
  onExportMd: () => void
  onDelete: () => void
}

export function TranscriptDetailLayout({
  transcript,
  title,
  text,
  segments,
  profiles,
  memoryStatus,
  documents,
  llmReady,
  saving,
  speakerSavePending,
  deletePending,
  onTitleChange,
  onTextChange,
  onSegmentSpeakerSave,
  onSave,
  onCopy,
  onExportTxt,
  onExportMd,
  onDelete,
}: TranscriptDetailLayoutProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") === "ai" ? "ai" : "transcript"

  const setTab = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === "transcript") {
        params.delete("tab")
      } else {
        params.set("tab", value)
      }
      const query = params.toString()
      router.replace(
        query ? `/transcripts/${transcript.id}?${query}` : `/transcripts/${transcript.id}`,
        { scroll: false },
      )
    },
    [router, searchParams, transcript.id],
  )

  const updatedLabel = new Date(transcript.updatedAt).toLocaleString()

  return (
    <div className="section-stack">
      <PageHeader
        backHref="/transcripts"
        backLabel="Transcripts"
        title={title || "Untitled transcript"}
        description="Edit transcript content or generate AI documents."
        badge={<Badge variant="secondary">Draft</Badge>}
        meta={
          <>
            Updated {updatedLabel}
            {transcript.language ? ` · ${transcript.language}` : null}
          </>
        }
      />

      <Tabs value={activeTab} onValueChange={setTab} className="section-stack">
        <TabsList variant="line" className="w-full justify-start border-b border-border pb-0">
          <TabsTrigger value="transcript" className="px-4 pb-3">
            Transcript
          </TabsTrigger>
          <TabsTrigger value="ai" className="px-4 pb-3">
            AI
            {documents.length > 0 ? (
              <Badge variant="outline" className="ml-1.5 h-5 px-1.5 text-xs">
                {documents.length}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transcript" className="mt-0 pt-6">
          <BlurFade>
            <TranscriptToolbar
              onSave={onSave}
              onCopy={onCopy}
              onExportTxt={onExportTxt}
              onExportMd={onExportMd}
              onDelete={onDelete}
              isSaving={saving}
              isDeleting={deletePending}
            />
            <TranscriptEditor
              title={title}
              text={text}
              speakerSegments={segments}
              profiles={profiles}
              memoryStatus={memoryStatus}
              processingNote={transcript.processingNote}
              onTitleChange={onTitleChange}
              onTextChange={onTextChange}
              onSegmentSpeakerSave={onSegmentSpeakerSave}
              speakerSavePending={speakerSavePending}
              disabled={saving || speakerSavePending}
            />
          </BlurFade>
        </TabsContent>

        <TabsContent value="ai" className="mt-0 pt-6">
          <TranscriptAiTab
            transcriptId={transcript.id}
            documents={documents}
            llmReady={llmReady}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
