import { ChevronDown, Pause, Play, RotateCcw, RotateCw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { PlaybackWaveform } from "@/components/audio/PlaybackWaveform"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  formatPlaybackRate,
  formatPlaybackTime,
  PLAYBACK_RATES,
  PLAYBACK_SKIP_SECONDS,
  type PlaybackRate,
} from "@/lib/audio"
import { cn } from "@/lib/utils"

type RecordingAudioPlayerProps = {
  filename?: string | null
  audioRef: React.RefObject<HTMLAudioElement | null>
  src: string
  isPlaying: boolean
  currentTime: number
  duration: number
  isReady: boolean
  playbackRate: PlaybackRate
  onPlaybackRateChange: (rate: PlaybackRate) => void
  onTogglePlay: () => void
  onSkipBackward: () => void
  onSkipForward: () => void
  onSeekInput: (value: number) => void
  onTimeUpdate: () => void
  onLoadedMetadata: () => void
  onCanPlay?: () => void
  onDurationChange?: () => void
  onPlay: () => void
  onPause: () => void
  onEnded: () => void
  className?: string
  variant?: "card" | "embedded"
}

export function RecordingAudioPlayer({
  filename,
  audioRef,
  src,
  isPlaying,
  currentTime,
  duration,
  isReady,
  playbackRate,
  onPlaybackRateChange,
  onTogglePlay,
  onSkipBackward,
  onSkipForward,
  onSeekInput,
  onTimeUpdate,
  onLoadedMetadata,
  onCanPlay,
  onDurationChange,
  onPlay,
  onPause,
  onEnded,
  className,
  variant = "card",
}: RecordingAudioPlayerProps) {
  const { t } = useTranslation()
  const max = duration > 0 ? duration : 0
  const canSeek = max > 0
  const isEmbedded = variant === "embedded"

  return (
    <div
      className={cn(
        isEmbedded ? "space-y-2" : "surface-card space-y-4 p-4",
        className,
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        crossOrigin="anonymous"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onCanPlay={onCanPlay}
        onDurationChange={onDurationChange}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
      />

      {filename ? (
        <p
          className={cn(
            "truncate text-center text-muted-foreground",
            isEmbedded ? "text-[10px]" : "text-xs",
          )}
        >
          {filename}
        </p>
      ) : null}

      <div className={isEmbedded ? "space-y-1" : "space-y-2"}>
        <PlaybackWaveform
          src={src}
          audioRef={audioRef}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={max}
          embedded={isEmbedded}
          disabled={!canSeek}
          onSeek={onSeekInput}
          aria-label={t("common.seekAriaLabel")}
        />
        <div
          className={cn(
            "flex items-center justify-between font-mono tabular-nums text-muted-foreground",
            isEmbedded ? "text-[10px]" : "text-xs",
          )}
        >
          <span>{formatPlaybackTime(currentTime)}</span>
          <span>{max > 0 ? formatPlaybackTime(max) : "0:00"}</span>
        </div>
      </div>

      <div
        className={cn(
          "relative flex items-center justify-center",
          isEmbedded ? "gap-1.5" : "gap-2 sm:gap-3",
        )}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="inline-flex">
                <Button
                  type="button"
                  variant="outline"
                  size={isEmbedded ? "icon-sm" : "icon"}
                  onClick={onSkipBackward}
                  disabled={!canSeek}
                  aria-label={t("common.backSeconds", { seconds: PLAYBACK_SKIP_SECONDS })}
                >
                  <RotateCcw className={isEmbedded ? "size-3.5" : "size-4"} />
                </Button>
              </span>
            }
          />
          <TooltipContent side="bottom">
            {t("common.backSeconds", { seconds: PLAYBACK_SKIP_SECONDS })}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <span className="inline-flex">
                <Button
                  type="button"
                  variant="secondary"
                  size={isEmbedded ? "icon" : "icon-lg"}
                  onClick={onTogglePlay}
                  aria-label={isPlaying ? t("common.pause") : t("common.play")}
                  disabled={!src}
                  className={cn("rounded-full", isEmbedded ? "size-8" : "size-11")}
                >
                  {isPlaying ? (
                    <Pause className={isEmbedded ? "size-3.5" : "size-5"} />
                  ) : (
                    <Play className={isEmbedded ? "size-3.5" : "size-5"} />
                  )}
                </Button>
              </span>
            }
          />
          <TooltipContent side="bottom">
            {isPlaying ? t("common.pause") : t("common.play")}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <span className="inline-flex">
                <Button
                  type="button"
                  variant="outline"
                  size={isEmbedded ? "icon-sm" : "icon"}
                  onClick={onSkipForward}
                  disabled={!canSeek}
                  aria-label={t("common.forwardSeconds", { seconds: PLAYBACK_SKIP_SECONDS })}
                >
                  <RotateCw className={isEmbedded ? "size-3.5" : "size-4"} />
                </Button>
              </span>
            }
          />
          <TooltipContent side="bottom">
            {t("common.forwardSeconds", { seconds: PLAYBACK_SKIP_SECONDS })}
          </TooltipContent>
        </Tooltip>

        <div className={cn("absolute right-0 flex items-center", isEmbedded ? "gap-1" : "gap-2")}>
          <span
            className={cn(
              "hidden text-muted-foreground sm:inline",
              isEmbedded ? "text-[10px]" : "text-xs",
            )}
          >
            {t("common.speed")}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size={isEmbedded ? "xs" : "sm"}
                  className="gap-1"
                  disabled={!canSeek}
                  aria-label={t("common.playbackSpeedAria", {
                    rate: formatPlaybackRate(playbackRate),
                  })}
                >
                  <span
                    className={cn(
                      "text-muted-foreground sm:hidden",
                      isEmbedded ? "text-[10px]" : "text-xs",
                    )}
                  >
                    {t("common.speed")}
                  </span>
                  {formatPlaybackRate(playbackRate)}
                  <ChevronDown className={cn("opacity-60", isEmbedded ? "size-3" : "size-3.5")} />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              {PLAYBACK_RATES.map((rate) => (
                <DropdownMenuItem
                  key={rate}
                  onClick={() => onPlaybackRateChange(rate)}
                  className={playbackRate === rate ? "bg-accent" : undefined}
                >
                  {formatPlaybackRate(rate)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
