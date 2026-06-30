import { cn } from "@/lib/utils"

type PageContainerProps = {
  children: React.ReactNode
  size?: "list" | "detail" | "wide"
  className?: string
}

const sizeClasses = {
  list: "max-w-3xl",
  detail: "max-w-4xl",
  wide: "max-w-5xl",
}

export function PageContainer({
  children,
  size = "detail",
  className,
}: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full page-stack", sizeClasses[size], className)}>
      {children}
    </div>
  )
}
