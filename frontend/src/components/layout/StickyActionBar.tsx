import { cn } from "@/lib/utils"

type StickyActionBarProps = {
  children: React.ReactNode
  className?: string
}

export function StickyActionBar({ children, className }: StickyActionBarProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 -mx-1 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-background/90 px-1 py-3 backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  )
}
