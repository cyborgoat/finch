
import { cn } from "@/lib/utils"

type TextShimmerProps = {
  children: string
  className?: string
  duration?: number
}

export function TextShimmer({
  children,
  className,
  duration = 2,
}: TextShimmerProps) {
  return (
    <span
      className={cn(
        "inline-block bg-[length:200%_100%] bg-clip-text text-transparent",
        "bg-gradient-to-r from-muted-foreground via-foreground to-muted-foreground",
        "animate-[shimmer_2s_ease-in-out_infinite]",
        className,
      )}
      style={{
        animationDuration: `${duration}s`,
      }}
    >
      {children}
    </span>
  )
}
