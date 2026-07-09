import { FilePlus, Loader2, Pause, Pencil, Play, Replace, RotateCcw, RotateCw, Save, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { PlaybackWaveform } from "@/components/audio/PlaybackWaveform"
import { TrimWaveform } from "@/components/audio/TrimWaveform"
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
  editable?: boolean
  editDisabled?: boolean
  isEditing?: boolean
  onEnterEdit?: () => void
  onCancelEdit?: () => void
  trimStart?: number
  trimEnd?: number
  onTrimChange?: (next: { trimStart: number; trimEnd: number }) => void
  onEditSeek?: (time: number) => void
  editCurrentTime?: number
  selectedDuration?: number
  onSaveAsNew?: () => void
  onReplace?: () => void
  editPending?: boolean
  canSubmitEdit?: boolean
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
  editable = false,
  editDisabled = false,
  isEditing = false,
  onEnterEdit,
  onCancelEdit,
  trimStart = 0,
  trimEnd = 0,
  onTrimChange,
  onEditSeek,
  editCurrentTime = 0,
  selectedDuration = 0,
  onSaveAsNew,
  onReplace,
  editPending = false,
  canSubmitEdit = false,
  className,
  variant = "card",
}: RecordingAudioPlayerProps) {
  const { t } = useTranslation()
  const max = duration > 0 ? duration : 0
  const canSeek = max > 0
  const isEmbedded = variant === "embedded"
  const displayCurrentTime = isEditing ? editCurrentTime : currentTime
  const displayEndTime = isEditing ? trimEnd : max
  const sideControlSize = isEmbedded ? "icon-sm" : "icon"
  const sideControlClass = isEmbedded ? "size-3.5" : "size-4"
  const playButtonSize = isEmbedded ? "size-8" : "size-11"
  const playIconClass = isEmbedded ? "size-3.5" : "size-5"
  const skipButtonSize = isEmbedded ? "size-7" : "size-8"

  const speedControl = (
    <div className={cn("inline-flex items-center", isEmbedded ? "gap-1" : "gap-1.5")}>
      <span
        className={cn(
          "text-muted-foreground",
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
              size={sideControlSize}
              disabled={!canSeek || editPending}
              className="font-mono tabular-nums"
              aria-label={t("common.playbackSpeedAria", {
                rate: formatPlaybackRate(playbackRate),
              })}
            >
              <span className={isEmbedded ? "text-[10px]" : "text-xs"}>
                {formatPlaybackRate(playbackRate)}
              </span>
            </Button>
          }
        />
        <DropdownMenuContent align="start">
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
  )

  return (
    <div
      className={cn(
        "relative",
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
        <div className="relative">
          <p
            className={cn(
              "truncate text-center text-muted-foreground",
              isEmbedded ? "text-[10px]" : "text-xs",
            )}
          >
            {filename}
          </p>
        </div>
      ) : null}

      <div className={isEmbedded ? "space-y-1" : "space-y-2"}>
        <div className={cn("relative w-full", isEmbedded ? "h-14" : "h-24")}>
          {isEditing ? (
            <TrimWaveform
              src={src}
              duration={max}
              trimStart={trimStart}
              trimEnd={trimEnd}
              currentTime={displayCurrentTime}
              embedded={isEmbedded}
              disabled={editPending || !canSeek}
              onTrimChange={onTrimChange ?? (() => undefined)}
              onSeek={onEditSeek ?? (() => undefined)}
              aria-label={t("audioEdit.waveformAriaLabel")}
              startHandleAriaLabel={t("audioEdit.startHandleAriaLabel")}
              endHandleAriaLabel={t("audioEdit.endHandleAriaLabel")}
              className="h-full"
            />
          ) : (
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
              className="h-full"
            />
          )}
        </div>
        <div
          className={cn(
            "grid grid-cols-[1fr_auto_1fr] items-center font-mono tabular-nums text-muted-foreground",
            isEmbedded ? "text-[10px]" : "text-xs",
          )}
        >
          <span>{formatPlaybackTime(displayCurrentTime)}</span>
          <span
            className={cn(
              "px-2 text-center",
              isEmbedded ? "min-w-[6.5rem]" : "min-w-[7.5rem]",
            )}
          >
            {isEditing
              ? t("audioEdit.selectedDuration", {
                  duration: formatPlaybackTime(selectedDuration),
                })
              : "\u00a0"}
          </span>
          <span className="text-right">
            {displayEndTime > 0 ? formatPlaybackTime(displayEndTime) : "0:00"}
          </span>
        </div>
      </div>

      <div
        className={cn(
          "relative flex min-h-8 items-center justify-center",
          isEmbedded ? "gap-1.5" : "gap-2 sm:gap-3",
          !isEmbedded && "min-h-11",
        )}
      >
        {!isEditing ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="inline-flex">
                  <Button
                    type="button"
                    variant="outline"
                    size={sideControlSize}
                    onClick={onSkipBackward}
                    disabled={!canSeek}
                    aria-label={t("common.backSeconds", { seconds: PLAYBACK_SKIP_SECONDS })}
                  >
                    <RotateCcw className={sideControlClass} />
                  </Button>
                </span>
              }
            />
            <TooltipContent side="bottom">
              {t("common.backSeconds", { seconds: PLAYBACK_SKIP_SECONDS })}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className={cn("inline-flex shrink-0", skipButtonSize)} aria-hidden />
        )}

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
                  disabled={!src || editPending}
                  className={cn("rounded-full", playButtonSize)}
                >
                  {isPlaying ? (
                    <Pause className={playIconClass} />
                  ) : (
                    <Play className={playIconClass} />
                  )}
                </Button>
              </span>
            }
          />
          <TooltipContent side="bottom">
            {isPlaying ? t("common.pause") : t("common.play")}
          </TooltipContent>
        </Tooltip>

        {!isEditing ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="inline-flex">
                  <Button
                    type="button"
                    variant="outline"
                    size={sideControlSize}
                    onClick={onSkipForward}
                    disabled={!canSeek}
                    aria-label={t("common.forwardSeconds", { seconds: PLAYBACK_SKIP_SECONDS })}
                  >
                    <RotateCw className={sideControlClass} />
                  </Button>
                </span>
              }
            />
            <TooltipContent side="bottom">
              {t("common.forwardSeconds", { seconds: PLAYBACK_SKIP_SECONDS })}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className={cn("inline-flex shrink-0", skipButtonSize)} aria-hidden />
        )}

        <div className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center justify-start">
          {speedControl}
        </div>

        <div
          className={cn(
            "absolute right-0 top-1/2 flex -translate-y-1/2 items-center justify-end",
            isEmbedded ? "gap-1" : "gap-1.5",
          )}
        >
          {isEditing ? (
            <>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span className="inline-flex">
                      <Button
                        type="button"
                        variant="outline"
                        size={sideControlSize}
                        onClick={onCancelEdit}
                        disabled={editPending}
                        aria-label={t("audioEdit.cancelEdit")}
                      >
                        <X className={sideControlClass} />
                      </Button>
                    </span>
                  }
                />
                <TooltipContent side="bottom">{t("audioEdit.cancelEdit")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span className="inline-flex">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="default"
                              size={sideControlSize}
                              disabled={!canSubmitEdit || editPending}
                              aria-label={t("audioEdit.saveButtonAriaLabel")}
                            >
                              {editPending ? (
                                <Loader2 className={cn(sideControlClass, "animate-spin")} />
                              ) : (
                                <Save className={sideControlClass} />
                              )}
                            </Button>
                          }
                        />
                        <DropdownMenuContent
                          align="end"
                          className="w-auto min-w-48 [&_[data-slot=dropdown-menu-item]]:gap-2"
                        >
                          <DropdownMenuItem
                            disabled={!canSubmitEdit || editPending}
                            onClick={onReplace}
                          >
                            <Replace />
                            {t("audioEdit.replaceCurrent")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!canSubmitEdit || editPending}
                            onClick={onSaveAsNew}
                          >
                            <FilePlus />
                            {t("audioEdit.saveAsNew")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </span>
                  }
                />
                <TooltipContent side="bottom">{t("common.save")}</TooltipContent>
              </Tooltip>
            </>
          ) : editable ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex">
                    <Button
                      type="button"
                      variant="outline"
                      size={sideControlSize}
                      onClick={onEnterEdit}
                      disabled={editDisabled || !src || editPending}
                      aria-label={t("audioEdit.editButton")}
                    >
                      <Pencil className={sideControlClass} />
                    </Button>
                  </span>
                }
              />
              <TooltipContent side="bottom">{t("audioEdit.editButton")}</TooltipContent>
            </Tooltip>
          ) : (
            <span className={cn("inline-flex shrink-0", skipButtonSize)} aria-hidden />
          )}
        </div>
      </div>
    </div>
  )
}
