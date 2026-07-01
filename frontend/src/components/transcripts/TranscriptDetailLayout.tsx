import { useNavigate, useSearch } from "@tanstack/react-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BlurFade } from "@/components/motion-primitives/blur-fade"
import { useRegisterTopbarActions } from "@/components/layout/TopbarActionsContext"
import { TranscriptNotesTab } from "@/components/transcripts/TranscriptNotesTab"
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
  const { t } = useTranslation()
  const navigate = useNavigate({ from: "/files/$id/" })
  const { tab, noteId } = useSearch({ from: "/files/$id/" })
  const activeTab = parseFileDetailTab(tab)
  const { data: audioAsset } = useAudioAsset(transcript.audioAssetId)
  const playback = useTranscriptPlayback(
    transcript.audioAssetId,
    audioAsset?.durationSeconds,
  )

  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null)
  const pendingSelectionRef = useRef<string | null>(null)

  const notes = useMemo(
    () =>
      [...documents].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      ),
    [documents],
  )

  const activeNoteId = useMemo(() => {
    if (pendingNoteId) {
      return pendingNoteId
    }
    if (noteId) {
      return noteId
    }
    return notes[0]?.id ?? null
  }, [noteId, notes, pendingNoteId])

  useEffect(() => {
    if (noteId && pendingSelectionRef.current === noteId) {
      pendingSelectionRef.current = null
      setPendingNoteId(null)
    }
  }, [noteId])

  useEffect(() => {
    if (
      activeTab === "notes" &&
      activeNoteId &&
      !noteId &&
      !pendingNoteId
    ) {
      void navigate({
        search: fileDetailTabSearch("notes", activeNoteId),
        replace: true,
      })
    }
  }, [activeNoteId, activeTab, navigate, noteId, pendingNoteId])

  const setTab = useCallback(
    (value: string) => {
      const nextTab = value as FileDetailTab
      if (nextTab === "notes" && activeNoteId) {
        void navigate({
          search: fileDetailTabSearch("notes", activeNoteId),
          replace: true,
        })
        return
      }
      void navigate({
        search: fileDetailTabSearch(nextTab),
        replace: true,
      })
    },
    [activeNoteId, navigate],
  )

  const setSelectedNoteId = useCallback(
    (nextNoteId: string | null) => {
      if (nextNoteId) {
        pendingSelectionRef.current = nextNoteId
        setPendingNoteId(nextNoteId)
      } else {
        pendingSelectionRef.current = null
        setPendingNoteId(null)
      }
      void navigate({
        search: fileDetailTabSearch("notes", nextNoteId),
        replace: true,
      })
    },
    [navigate],
  )

  const {
    data: activeNoteDocument,
    isLoading: activeNoteLoading,
    isFetching: activeNoteFetching,
  } = useDocument(activeNoteId ?? "")

  const activeNote =
    activeNoteDocument?.id === activeNoteId ? activeNoteDocument : undefined
  const activeNoteLoadingState =
    !!activeNoteId && (activeNoteLoading || activeNoteFetching) && !activeNote

  const topbarActions = useMemo(
    () => ({
      audioAssetId: transcript.audioAssetId,
      audioFilename: audioAsset?.filename,
      title,
      transcriptText: text,
      activeNoteMarkdown: activeNoteDocument?.markdown ?? null,
      activeNoteTitle: activeNoteDocument?.title ?? null,
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
      activeNoteDocument?.markdown,
      activeNoteDocument?.title,
      onRename,
      onDelete,
      renamePending,
      deletePending,
    ],
  )

  useRegisterTopbarActions(topbarActions, [topbarActions])

  const noteCount = notes.length

  return (
    <div className="section-stack">
      <Tabs value={activeTab} onValueChange={setTab} className="section-stack">
        <TabsList variant="line" className="w-full justify-start border-b border-border pb-0">
          <TabsTrigger value="source" className="px-4 pb-3">
            {t("nav.source")}
          </TabsTrigger>
          <TabsTrigger value="notes" className="px-4 pb-3">
            {t("nav.notes")}
            {noteCount > 0 ? (
              <Badge variant="outline" className="ml-1.5 h-5 px-1.5 text-xs">
                {noteCount}
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

        <TabsContent value="notes" className="mt-0 pt-6">
          <TranscriptNotesTab
            transcriptId={transcript.id}
            documents={documents}
            llmReady={llmReady}
            activeNoteId={activeNoteId}
            activeNote={activeNote}
            noteLoading={activeNoteLoadingState}
            onNoteIdChange={setSelectedNoteId}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
