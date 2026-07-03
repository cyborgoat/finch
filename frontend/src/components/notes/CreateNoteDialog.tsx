import { useQuery } from "@tanstack/react-query"
import { Trans, useTranslation } from "react-i18next"
import {
  ClipboardList,
  Gavel,
  Mail,
  Notebook,
  PenLine,
  type LucideIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Link } from "@tanstack/react-router"
import { listAiActionTemplates } from "@/lib/api"
import type { AiActionTemplate } from "@/lib/types"
import { cn } from "@/lib/utils"

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  meeting_summary: Notebook,
  action_items: ClipboardList,
  key_decisions: Gavel,
  follow_up_email: Mail,
}

type CreateNoteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  llmReady: boolean
  pendingTemplateId?: string | null
  creatingBlank?: boolean
  onSelectTemplate: (template: AiActionTemplate) => void
  onSelectBlank: () => void
}

function TemplateTile({
  icon: Icon,
  title,
  description,
  statusText,
  disabled,
  onClick,
}: {
  icon: LucideIcon
  title: string
  description: string
  statusText?: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-full rounded-lg bg-muted/20 p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <p className="text-base font-medium">{title}</p>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {statusText ? (
        <p className="mt-2 text-sm text-muted-foreground">{statusText}</p>
      ) : null}
    </button>
  )
}

export function CreateNoteDialog({
  open,
  onOpenChange,
  llmReady,
  pendingTemplateId = null,
  creatingBlank = false,
  onSelectTemplate,
  onSelectBlank,
}: CreateNoteDialogProps) {
  const { t } = useTranslation()
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ["ai-actions", "templates"],
    queryFn: listAiActionTemplates,
    enabled: open,
  })

  const busy = !!pendingTemplateId || creatingBlank
  const templates: AiActionTemplate[] = templatesData?.items ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("notes.createDialogTitle")}</DialogTitle>
          <DialogDescription>{t("notes.createDialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              {t("notes.loadingTemplates")}
            </p>
          ) : (
            templates.map((template) => {
              const Icon = TEMPLATE_ICONS[template.id] ?? Notebook
              const templateTitle = t(`templates.${template.id}.title`, {
                defaultValue: template.title,
              })
              const templateDescription = t(`templates.${template.id}.description`, {
                defaultValue: template.description,
              })
              return (
                <TemplateTile
                  key={template.id}
                  icon={Icon}
                  title={templateTitle}
                  description={templateDescription}
                  statusText={
                    pendingTemplateId === template.id ? t("common.starting") : undefined
                  }
                  disabled={!llmReady || busy}
                  onClick={() => onSelectTemplate(template)}
                />
              )
            })
          )}

          <TemplateTile
            icon={PenLine}
            title={t("notes.blankNote")}
            description={t("notes.blankDescription")}
            statusText={creatingBlank ? t("common.creating") : undefined}
            disabled={busy}
            onClick={onSelectBlank}
          />
        </div>

        {!llmReady ? (
          <p className="text-sm text-muted-foreground">
            <Trans
              i18nKey="notes.llmRequiredBanner"
              components={{
                link: (
                  <Link to="/settings" className="underline underline-offset-2">
                    {t("nav.settingsLlmProvider")}
                  </Link>
                ),
              }}
            />
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
