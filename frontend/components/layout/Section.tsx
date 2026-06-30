import { cn } from "@/lib/utils"

type SectionProps = {
  title?: string
  description?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

export function Section({
  title,
  description,
  children,
  className,
  contentClassName,
}: SectionProps) {
  return (
    <section className={cn("field-stack", className)}>
      {title || description ? (
        <div className="field-stack">
          {title ? <h2 className="section-label">{title}</h2> : null}
          {description ? <p className="section-hint">{description}</p> : null}
        </div>
      ) : null}
      <div className={cn(contentClassName)}>{children}</div>
    </section>
  )
}
