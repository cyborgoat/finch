import { useNavigate, useSearch } from "@tanstack/react-router"
import { useCallback, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BlurFade } from "@/components/motion-primitives/blur-fade"
import { useRegisterTopbarActions } from "@/components/layout/TopbarActionsContext"
import { TranscriptSummaryTab } from "@/components/transcripts/TranscriptSummaryTab"
import { TranscriptAudioPlayer } from "@/components/transcripts/TranscriptAudioPlayer"
import { FullTranscriptPanel } from "@/components/transcripts/FullTranscriptPanel"
import { useAudioAsset } from "@/hooks/useAudioAsset"
import { useDocument } from "@/hooks/useDocuments"
import { useTranscriptPlayback } from "@/hooks/useTranscriptPlayback"
import type { DocumentSummary, SpeakerMemoryStatus, SpeakerProfileSummary, Transcript } from "@/lib/types"
import type { SpeakerSegment } from "@/lib/types"
import {
  fileDetailTabSearch,
  parseFileDetailTab,
  type FileDetailTab,
} from "@/lib/fileDetailTabs"

type TranscriptDetailLayoutProps = {
  transcript: Transcript
  title: string
  text: string
  segments: SpeakerSegment[]
  profiles: SpeakerProfileSummary[]
  memoryStatus?: SpeakerMemoryStatus
  documents: DocumentSummary[]
  llmReady?: boolean
  speakerSavePending: boolean
  renamePending: boolean
  deletePending: boolean
  onRename: (title: string) => void | Promise<void>
  onDelete: () => void
  onSegmentSpeakerSave: (
    clusterId: string,
    segment: SpeakerSegment,
    payload: { displayName: string; profileId?: string },
  ) => Promise<void>
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
  speakerSavePending,
  renamePending,
  deletePending,
  onRename,
  onDelete,
  onSegmentSpeakerSave,
}: TranscriptDetailLayoutProps) {
  const navigate = useNavigate({ from: "/files/$id/" })
  const { tab } = useSearch({ from: "/files/$id/" })
  const activeTab = parseFileDetailTab(tab)
  const { data: audioAsset } = useAudioAsset(transcript.audioAssetId)
  const playback = useTranscriptPlayback(
    transcript.audioAssetId,
    audioAsset?.durationSeconds,
  )

  const summaryDocumentSummary = useMemo(
    () =>
      documents
        .filter((document) => document.type === "markdown_summary")
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null,
    [documents],
  )

  const { data: summaryDocument } = useDocument(summaryDocumentSummary?.id ?? "")

  const setTab = useCallback(
    (value: string) => {
      void navigate({
        search: fileDetailTabSearch(value as FileDetailTab),
        replace: true,
      })
    },
    [navigate],
  )

  const topbarActions = useMemo(
    () => ({
      audioAssetId: transcript.audioAssetId,
      audioFilename: audioAsset?.filename,
      title,
      transcriptText: text,
      summaryMarkdown: summaryDocument?.markdown ?? null,
      onRename,
      onDelete,
      isRenaming: renamePending,
      isDeleting: deletePending,
    }),
    [
      transcript.audioAssetId,
      audioAsset?.filename,
      title,
      text,
      summaryDocument?.markdown,
      onRename,
      onDelete,
      renamePending,
      deletePending,
    ],
  )

  useRegisterTopbarActions(topbarActions, [topbarActions])

  const hasSummary = !!summaryDocumentSummary

  return (
    <div className="section-stack">
      <Tabs value={activeTab} onValueChange={setTab} className="section-stack">
        <TabsList variant="line" className="w-full justify-start border-b border-border pb-0">
          <TabsTrigger value="source" className="px-4 pb-3">
            Source
          </TabsTrigger>
          <TabsTrigger value="summary" className="px-4 pb-3">
            Summary
            {hasSummary ? (
              <Badge variant="outline" className="ml-1.5 h-5 px-1.5 text-xs">
                Ready
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="source" className="mt-0 pt-6">
          <BlurFade className="section-stack">
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
              onCanPlay={playback.handleCanPlay}
              onDurationChange={playback.handleDurationChange}
              onPlay={playback.handlePlay}
              onPause={playback.handlePause}
              onEnded={playback.handleEnded}
            />
            <FullTranscriptPanel
              text={text}
              segments={segments}
              profiles={profiles}
              memoryStatus={memoryStatus}
              currentPlaybackTime={playback.currentTime}
              onSeekToTime={playback.seekAndPlay}
              onSegmentSpeakerSave={onSegmentSpeakerSave}
              speakerSavePending={speakerSavePending}
              disabled={speakerSavePending || renamePending || deletePending}
            />
          </BlurFade>
        </TabsContent>

        <TabsContent value="summary" className="mt-0 pt-6">
          <TranscriptSummaryTab
            transcriptId={transcript.id}
            documents={documents}
            llmReady={llmReady}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
