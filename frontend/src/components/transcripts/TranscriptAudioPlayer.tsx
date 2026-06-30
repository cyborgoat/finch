
import { ChevronDown, Pause, Play, RotateCcw, RotateCw } from "lucide-react"
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

type TranscriptAudioPlayerProps = {
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
}

export function TranscriptAudioPlayer({
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
}: TranscriptAudioPlayerProps) {
  const max = duration > 0 ? duration : 0
  const canControl = Boolean(src) && (isReady || max > 0)
  const progress = max > 0 ? (currentTime / max) * 100 : 0

  return (
    <div className={cn("surface-card space-y-4 p-4", className)}>
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
        <p className="truncate text-center text-xs text-muted-foreground">{filename}</p>
      ) : null}

      <div className="space-y-2">
        <input
          type="range"
          min={0}
          max={max || 1}
          step={0.1}
          value={Math.min(currentTime, max || 0)}
          disabled={!canControl || max <= 0}
          onChange={(event) => onSeekInput(Number(event.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
          aria-label="Seek"
          style={{
            background: `linear-gradient(to right, var(--primary) ${progress}%, var(--muted) ${progress}%)`,
          }}
        />
        <div className="flex items-center justify-between font-mono text-xs tabular-nums text-muted-foreground">
          <span>{formatPlaybackTime(currentTime)}</span>
          <span>{max > 0 ? formatPlaybackTime(max) : "0:00"}</span>
        </div>
      </div>

      <div className="relative flex items-center justify-center gap-2 sm:gap-3">
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="inline-flex">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onSkipBackward}
                  disabled={!canControl}
                  aria-label={`Back ${PLAYBACK_SKIP_SECONDS} seconds`}
                >
                  <RotateCcw className="size-4" />
                </Button>
              </span>
            }
          />
          <TooltipContent side="bottom">
            Back {PLAYBACK_SKIP_SECONDS} seconds
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <span className="inline-flex">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-lg"
                  onClick={onTogglePlay}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  disabled={!src}
                  className="size-11 rounded-full"
                >
                  {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
                </Button>
              </span>
            }
          />
          <TooltipContent side="bottom">{isPlaying ? "Pause" : "Play"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <span className="inline-flex">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onSkipForward}
                  disabled={!canControl}
                  aria-label={`Forward ${PLAYBACK_SKIP_SECONDS} seconds`}
                >
                  <RotateCw className="size-4" />
                </Button>
              </span>
            }
          />
          <TooltipContent side="bottom">
            Forward {PLAYBACK_SKIP_SECONDS} seconds
          </TooltipContent>
        </Tooltip>

        <div className="absolute right-0 flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">
           Speed
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={!canControl}
                  aria-label={`Playback speed, currently ${formatPlaybackRate(playbackRate)}`}
                >
                  <span className="text-xs text-muted-foreground sm:hidden">Speed</span>
                  {formatPlaybackRate(playbackRate)}
                  <ChevronDown className="size-3.5 opacity-60" />
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
