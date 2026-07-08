import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { barCountForWidth, type BarWaveformSize } from "@/components/audio/waveform-utils"
import { Skeleton } from "@/components/ui/skeleton"
import { waveformContainerClass } from "@/lib/surfaces"
import { cn } from "@/lib/utils"

type WaveformSkeletonProps = {
  embedded?: boolean
  size?: BarWaveformSize
  className?: string
  showLabel?: boolean
}

function skeletonBarHeight(index: number, total: number) {
  const wave = Math.sin((index / total) * Math.PI * 4) * 0.22
  const base = 0.28 + ((index * 17) % 11) / 40
  return Math.round((base + wave) * 100)
}

export const WaveformSkeleton = forwardRef<HTMLDivElement, WaveformSkeletonProps>(
  function WaveformSkeleton(
    { embedded = false, size, className, showLabel = false },
    ref,
  ) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const barSize = size ?? "default"

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node
      if (typeof ref === "function") {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    },
    [ref],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateWidth = () => setWidth(container.clientWidth)
    updateWidth()

    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const barCount = barCountForWidth(width > 0 ? width : 320, barSize)
  const barHeights = useMemo(
    () => Array.from({ length: barCount }, (_, index) => skeletonBarHeight(index, barCount)),
    [barCount],
  )

  return (
    <div
      ref={setContainerRef}
      aria-busy="true"
      aria-label={t("common.loadingAudio")}
      className={cn(
        "relative w-full overflow-hidden rounded-lg",
        embedded ? "h-14" : "h-20",
        embedded ? waveformContainerClass("embedded") : waveformContainerClass("card"),
        className,
      )}
    >
      <div className="flex h-full items-end gap-px px-1 pb-1.5 pt-1.5">
        {barHeights.map((height, index) => (
          <Skeleton
            key={index}
            className="min-w-0 flex-1 rounded-sm"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      {showLabel ? (
        <p className="absolute inset-x-0 bottom-1 text-center text-[10px] text-muted-foreground">
          {t("common.loadingAudio")}
        </p>
      ) : (
        <span className="sr-only">{t("common.loadingAudio")}</span>
      )}
    </div>
  )
  },
)
