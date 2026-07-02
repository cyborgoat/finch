import { useTranslation } from "react-i18next"
import { shouldWarnLongRecording } from "@/lib/recordingLimits"
import { cn } from "@/lib/utils"

type LongRecordingHintProps = {
  durationSeconds: number
  durationLimitReached?: boolean
  className?: string
}

export function LongRecordingHint({
  durationSeconds,
  durationLimitReached = false,
  className,
}: LongRecordingHintProps) {
  const { t } = useTranslation()

  if (durationLimitReached) {
    return (
      <p
        role="status"
        className={cn(
          "rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-foreground",
          className,
        )}
      >
        {t("record.durationLimitReached")}
      </p>
    )
  }

  if (!shouldWarnLongRecording(durationSeconds)) {
    return (
      <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
        {t("record.uploadForLongSessions")}
      </p>
    )
  }

  return (
    <p
      role="status"
      className={cn(
        "rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-foreground",
        className,
      )}
    >
      {t("record.longSessionHint")}
    </p>
  )
}
