import { WaveformSkeleton } from "@/components/audio/WaveformSkeleton"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type AudioPlayerSkeletonProps = {
  embedded?: boolean
  showFilename?: boolean
  className?: string
}

export function AudioPlayerSkeleton({
  embedded = false,
  showFilename = false,
  className,
}: AudioPlayerSkeletonProps) {
  return (
    <div
      className={cn(embedded ? "space-y-2" : "surface-card space-y-4 p-4", className)}
      aria-busy="true"
    >
      {showFilename ? (
        <Skeleton
          className={cn("mx-auto", embedded ? "h-2.5 w-32" : "h-3 w-40")}
        />
      ) : null}

      <div className={embedded ? "space-y-1" : "space-y-2"}>
        <WaveformSkeleton embedded={embedded} showLabel />
        <div
          className={cn(
            "flex items-center justify-between",
            embedded ? "text-[10px]" : "text-xs",
          )}
        >
          <Skeleton className={embedded ? "h-2.5 w-8" : "h-3 w-10"} />
          <Skeleton className={embedded ? "h-2.5 w-8" : "h-3 w-10"} />
        </div>
      </div>

      <div
        className={cn(
          "relative flex items-center justify-center",
          embedded ? "gap-1.5" : "gap-2 sm:gap-3",
        )}
      >
        <Skeleton className={embedded ? "size-7 rounded-md" : "size-9 rounded-md"} />
        <Skeleton
          className={cn("rounded-full", embedded ? "size-8" : "size-11")}
        />
        <Skeleton className={embedded ? "size-7 rounded-md" : "size-9 rounded-md"} />
        <Skeleton
          className={cn(
            "absolute right-0 rounded-md",
            embedded ? "h-6 w-14" : "h-8 w-16",
          )}
        />
      </div>
    </div>
  )
}
