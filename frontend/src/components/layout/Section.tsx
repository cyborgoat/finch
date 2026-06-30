import { cn } from "@/lib/utils"

type SectionProps = {
  title?: string
  description?: React.ReactNode
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
  contentClassName?: string
}

export function Section({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: SectionProps) {
  return (
    <section className={cn("field-stack", className)}>
      {title || description || action ? (
        <div className="flex items-start justify-between gap-3">
          <div className="field-stack min-w-0 flex-1">
            {title ? <h2 className="section-label">{title}</h2> : null}
            {description ? <p className="section-hint">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children ? <div className={cn(contentClassName)}>{children}</div> : null}
    </section>
  )
}
