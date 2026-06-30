"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BlurFade } from "@/components/motion-primitives/blur-fade"
import { PageHeader } from "@/components/layout/PageHeader"
import { TranscriptAiTab } from "@/components/transcripts/TranscriptAiTab"
import { TranscriptAudioPlayer } from "@/components/transcripts/TranscriptAudioPlayer"
import { TranscriptEditor } from "@/components/transcripts/TranscriptEditor"
import { ActiveTranscriptSegment } from "@/components/transcripts/ActiveTranscriptSegment"
import { FullTranscriptPanel } from "@/components/transcripts/FullTranscriptPanel"
import { TranscriptToolbar } from "@/components/transcripts/TranscriptToolbar"
import { useAudioAsset } from "@/hooks/useAudioAsset"
import { useTranscriptPlayback } from "@/hooks/useTranscriptPlayback"
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
  const { data: audioAsset } = useAudioAsset(transcript.audioAssetId)
  const playback = useTranscriptPlayback(transcript.audioAssetId)

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
        description="Listen, edit, and review this transcript."
        badge={<Badge variant="secondary">Draft</Badge>}
        meta={
          <>
            Updated {updatedLabel}
            {transcript.language ? ` · ${transcript.language}` : null}
          </>
        }
      />

      <TranscriptAudioPlayer
        filename={audioAsset?.filename}
        audioRef={playback.audioRef}
        src={playback.src}
        isPlaying={playback.isPlaying}
        currentTime={playback.currentTime}
        duration={playback.duration || audioAsset?.durationSeconds || 0}
        isReady={playback.isReady}
        playbackRate={playback.playbackRate}
        onPlaybackRateChange={playback.setPlaybackRate}
        onTogglePlay={playback.togglePlay}
        onSkipBackward={playback.skipBackward}
        onSkipForward={playback.skipForward}
        onSeekInput={playback.handleSeekInput}
        onTimeUpdate={playback.handleTimeUpdate}
        onLoadedMetadata={playback.handleLoadedMetadata}
        onPlay={playback.handlePlay}
        onPause={playback.handlePause}
        onEnded={playback.handleEnded}
      />

      <ActiveTranscriptSegment
        segments={segments}
        fallbackText={text}
        profiles={profiles}
        memoryStatus={memoryStatus}
        processingNote={transcript.processingNote}
        currentPlaybackTime={playback.currentTime}
        isPlaying={playback.isPlaying}
        onSeekToTime={playback.seekAndPlay}
        onSegmentSpeakerSave={onSegmentSpeakerSave}
        speakerSavePending={speakerSavePending}
        disabled={saving || speakerSavePending}
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
          <BlurFade className="section-stack">
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
              onTitleChange={onTitleChange}
              disabled={saving || speakerSavePending}
            />
            <FullTranscriptPanel
              text={text}
              segments={segments}
              profiles={profiles}
              memoryStatus={memoryStatus}
              currentPlaybackTime={playback.currentTime}
              onSeekToTime={playback.seekAndPlay}
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
