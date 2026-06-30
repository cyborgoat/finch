import { Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

type PageHeaderProps = {
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  badge?: React.ReactNode
  actions?: React.ReactNode
  meta?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
  badge,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("field-stack", className)}>
      {backHref ? (
        <Link
          to={backHref}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="field-stack min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title">{title}</h1>
            {badge}
          </div>
          {description ? <p className="section-hint">{description}</p> : null}
          {meta ? <div className="text-xs text-muted-foreground">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
