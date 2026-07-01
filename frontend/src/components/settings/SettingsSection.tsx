import { cn } from "@/lib/utils"

type SettingsSectionProps = {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  bordered?: boolean
}

export function SettingsSection({
  title,
  description,
  children,
  className,
  bordered = true,
}: SettingsSectionProps) {
  return (
    <section className={cn("field-stack", className)}>
      <div className="field-stack">
        <h2 className="section-label">{title}</h2>
        {description ? <p className="section-hint">{description}</p> : null}
      </div>
      {bordered ? (
        <div className="overflow-hidden rounded-lg border border-border">{children}</div>
      ) : (
        children
      )}
    </section>
  )
}

type SettingsRowProps = {
  label: string
  labelAdornment?: React.ReactNode
  description?: string
  children?: React.ReactNode
}

export function SettingsRow({ label, labelAdornment, description, children }: SettingsRowProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className={children == null ? "min-w-0 flex-1" : "min-w-0"}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {labelAdornment}
        </div>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children != null ? (
        <div className="w-full shrink-0 sm:w-56">{children}</div>
      ) : null}
    </div>
  )
}
