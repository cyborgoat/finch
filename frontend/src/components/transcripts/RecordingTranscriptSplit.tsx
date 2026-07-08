import { useRef } from "react"
import { useTranslation } from "react-i18next"
import { FullTranscriptPanel } from "@/components/transcripts/FullTranscriptPanel"
import { SpeakerTimelinePanel } from "@/components/transcripts/SpeakerTimelinePanel"
import { useHorizontalPanelResize } from "@/hooks/useHorizontalPanelResize"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import type {
  SpeakerSegment,
  VoiceprintProfileSummary,
  VoiceprintProfilesStatus,
} from "@/lib/types"

const SPEAKER_PANEL_DEFAULT_WIDTH = 288
const SPEAKER_PANEL_MIN_WIDTH = 200

type RecordingTranscriptSplitProps = {
  segments: SpeakerSegment[]
  profiles: VoiceprintProfileSummary[]
  voiceprintProfilesStatus?: VoiceprintProfilesStatus
  text: string
  currentSegmentIndex: number
  selectedSegmentIndex: number | null
  currentPlaybackTime: number
  playbackDuration: number
  assetDuration?: number | null
  onChunkSelect: (segmentIndex: number) => void
  onSeekToTime: (seconds: number) => void
  onSegmentSpeakerSave?: (
    clusterId: string,
    segment: SpeakerSegment,
    payload: { displayName: string; profileId: string | null; enroll: boolean },
  ) => Promise<void>
  speakerSavePending?: boolean
  disabled?: boolean
}

export function RecordingTranscriptSplit({
  segments,
  profiles,
  voiceprintProfilesStatus,
  text,
  currentSegmentIndex,
  selectedSegmentIndex,
  currentPlaybackTime,
  playbackDuration,
  assetDuration,
  onChunkSelect,
  onSeekToTime,
  onSegmentSpeakerSave,
  speakerSavePending,
  disabled,
}: RecordingTranscriptSplitProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const containerRef = useRef<HTMLDivElement>(null)
  const { width: speakerPanelWidth, onResizePointerDown } = useHorizontalPanelResize(
    containerRef,
    {
      defaultWidth: SPEAKER_PANEL_DEFAULT_WIDTH,
      minWidth: SPEAKER_PANEL_MIN_WIDTH,
    },
  )

  return (
    <div
      ref={containerRef}
      className="flex min-h-96 flex-col gap-3 md:flex-row md:items-stretch md:gap-0"
    >
      <div
        className="w-full shrink-0"
        style={isMobile ? undefined : { width: speakerPanelWidth }}
      >
        <SpeakerTimelinePanel
          segments={segments}
          profiles={profiles}
          currentSegmentIndex={currentSegmentIndex}
          currentPlaybackTime={currentPlaybackTime}
          playbackDuration={playbackDuration}
          assetDuration={assetDuration}
          onChunkSelect={onChunkSelect}
          disabled={disabled}
        />
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t("recording.resizeSpeakersPanelAriaLabel")}
        aria-valuenow={Math.round(speakerPanelWidth)}
        onPointerDown={onResizePointerDown}
        className={cn(
          "relative hidden w-2 shrink-0 cursor-col-resize touch-none md:flex",
          "items-center justify-center",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <span
          className="h-10 w-1 rounded-full bg-border/80 transition-colors hover:bg-foreground/35 active:bg-foreground/45"
          aria-hidden
        />
      </div>

      <div className="surface-card min-w-0 flex-1 overflow-hidden">
        <FullTranscriptPanel
          variant="embedded"
          text={text}
          segments={segments}
          profiles={profiles}
          voiceprintProfilesStatus={voiceprintProfilesStatus}
          currentPlaybackTime={currentPlaybackTime}
          selectedSegmentIndex={selectedSegmentIndex}
          onSeekToTime={onSeekToTime}
          onSegmentSpeakerSave={onSegmentSpeakerSave}
          speakerSavePending={speakerSavePending}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
