import { cn } from "@/lib/utils"

type PageContainerProps = {
  children: React.ReactNode
  size?: "content" | "detail" | "wide" | "list"
  contentWidth?: "full" | "content"
  className?: string
}

const sizeClasses = {
  content: "max-w-3xl",
  detail: "max-w-6xl",
  wide: "max-w-6xl",
  list: "max-w-6xl",
}

export function PageContainer({
  children,
  size = "detail",
  contentWidth = "full",
  className,
}: PageContainerProps) {
  const inner =
    contentWidth === "content" ? (
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    ) : (
      children
    )

  return (
    <div className={cn("mx-auto w-full page-stack", sizeClasses[size], className)}>
      {inner}
    </div>
  )
}
