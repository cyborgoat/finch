import { useNavigate, useSearch } from "@tanstack/react-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BlurFade } from "@/components/motion-primitives/blur-fade"
import { RecordingSourceCard } from "@/components/transcripts/RecordingSourceCard"
import { useRegisterTopbarActions } from "@/components/layout/TopbarActionsContext"
import { RecordingNotesTab } from "@/components/transcripts/TranscriptNotesTab"
import { RecordingPageAudio } from "@/components/transcripts/TranscriptPageAudio"
import { FullTranscriptPanel } from "@/components/transcripts/FullTranscriptPanel"
import { useAudioAsset } from "@/hooks/useAudioAsset"
import { useNote } from "@/hooks/useNotes"
import { useRecordingPlayback } from "@/hooks/useRecordingPlayback"
import type { NoteSummary, VoiceprintProfilesStatus, VoiceprintProfileSummary, Recording } from "@/lib/types"
import type { SpeakerSegment } from "@/lib/types"
import {
  recordingDetailTabSearch,
  parseRecordingDetailTab,
  type RecordingDetailTab,
} from "@/lib/recordingDetailTabs"

type RecordingDetailLayoutProps = {
  recording: Recording
  title: string
  text: string
  segments: SpeakerSegment[]
  profiles: VoiceprintProfileSummary[]
  voiceprintProfilesStatus?: VoiceprintProfilesStatus
  notes: NoteSummary[]
  llmReady?: boolean
  speakerSavePending: boolean
  renamePending: boolean
  deletePending: boolean
  onRename: (title: string) => void | Promise<void>
  onDelete: () => void
  onSegmentSpeakerSave: (
    clusterId: string,
    segment: SpeakerSegment,
    payload: { displayName: string; profileId: string | null; enroll: boolean },
  ) => Promise<void>
  onRegenerateTranscription?: () => void | Promise<void>
  isRegenerating?: boolean
}

export function RecordingDetailLayout({
  recording,
  title,
  text,
  segments,
  profiles,
  voiceprintProfilesStatus,
  notes: noteSummaries,
  llmReady,
  speakerSavePending,
  renamePending,
  deletePending,
  onRename,
  onDelete,
  onSegmentSpeakerSave,
  onRegenerateTranscription,
  isRegenerating,
}: RecordingDetailLayoutProps) {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: "/recordings/$id/" })
  const { tab, noteId } = useSearch({ from: "/recordings/$id/" })
  const activeTab = parseRecordingDetailTab(tab)
  const { data: audioAsset } = useAudioAsset(recording.audioAssetId)
  const playback = useRecordingPlayback(
    recording.audioAssetId,
    audioAsset?.durationSeconds,
  )

  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null)
  const pendingSelectionRef = useRef<string | null>(null)

  const notes = useMemo(
    () =>
      [...noteSummaries].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      ),
    [noteSummaries],
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
        search: recordingDetailTabSearch("notes", activeNoteId),
        replace: true,
      })
    }
  }, [activeNoteId, activeTab, navigate, noteId, pendingNoteId])

  const setTab = useCallback(
    (value: string) => {
      const nextTab = value as RecordingDetailTab
      if (nextTab === "notes" && activeNoteId) {
        void navigate({
          search: recordingDetailTabSearch("notes", activeNoteId),
          replace: true,
        })
        return
      }
      void navigate({
        search: recordingDetailTabSearch(nextTab),
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
        search: recordingDetailTabSearch("notes", nextNoteId),
        replace: true,
      })
    },
    [navigate],
  )

  const {
    data: activeNote,
    isLoading: activeNoteLoading,
    isFetching: activeNoteFetching,
  } = useNote(activeNoteId ?? "")

  const resolvedActiveNote =
    activeNote?.id === activeNoteId ? activeNote : undefined
  const activeNoteLoadingState =
    !!activeNoteId && (activeNoteLoading || activeNoteFetching) && !resolvedActiveNote

  const topbarActions = useMemo(
    () => ({
      audioAssetId: recording.audioAssetId,
      audioFilename: audioAsset?.filename,
      title,
      transcriptText: text,
      activeNoteMarkdown: resolvedActiveNote?.markdown ?? null,
      activeNoteTitle: resolvedActiveNote?.title ?? null,
      onRename,
      onDelete,
      onRegenerateTranscription,
      isRenaming: renamePending,
      isDeleting: deletePending,
      isRegenerating,
    }),
    [
      recording.audioAssetId,
      audioAsset?.filename,
      title,
      text,
      resolvedActiveNote?.markdown,
      resolvedActiveNote?.title,
      onRename,
      onDelete,
      onRegenerateTranscription,
      renamePending,
      deletePending,
      isRegenerating,
    ],
  )

  useRegisterTopbarActions(topbarActions, [topbarActions])

  const noteCount = notes.length

  return (
    <div className="section-stack">
      <Tabs value={activeTab} onValueChange={setTab} className="gap-0">
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

        <TabsContent value="source" className="mt-0 pt-3">
          <BlurFade>
            <RecordingSourceCard
              className="border-0"
              audioClassName="p-3 sm:p-4"
              audio={
                <RecordingPageAudio
                  audioAssetId={recording.audioAssetId}
                  title={title}
                  variant="embedded"
                  playback={playback}
                />
              }
            >
              <FullTranscriptPanel
                variant="embedded"
                text={text}
                segments={segments}
                profiles={profiles}
                voiceprintProfilesStatus={voiceprintProfilesStatus}
                currentPlaybackTime={playback.currentTime}
                onSeekToTime={playback.seekAndPlay}
                onSegmentSpeakerSave={onSegmentSpeakerSave}
                speakerSavePending={speakerSavePending}
                disabled={speakerSavePending || renamePending || deletePending}
              />
            </RecordingSourceCard>
          </BlurFade>
        </TabsContent>

        <TabsContent value="notes" className="mt-0 pt-3">
          <RecordingNotesTab
            recordingId={recording.id}
            notes={noteSummaries}
            llmReady={llmReady}
            activeNoteId={activeNoteId}
            activeNote={resolvedActiveNote}
            noteLoading={activeNoteLoadingState}
            onNoteIdChange={setSelectedNoteId}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
