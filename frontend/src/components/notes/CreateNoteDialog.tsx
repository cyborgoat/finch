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
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
                <button
                  key={template.id}
                  type="button"
                  disabled={!llmReady || busy}
                  onClick={() => onSelectTemplate(template)}
                  className={cn(
                    "text-left transition-opacity",
                    !llmReady && "cursor-not-allowed opacity-50",
                  )}
                >
                  <Card className="h-full hover:border-primary/40 hover:bg-muted/30">
                    <CardHeader className="gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 text-primary" />
                        <CardTitle className="text-base">{templateTitle}</CardTitle>
                      </div>
                      <CardDescription>{templateDescription}</CardDescription>
                      {pendingTemplateId === template.id ? (
                        <CardDescription>{t("common.starting")}</CardDescription>
                      ) : null}
                    </CardHeader>
                  </Card>
                </button>
              )
            })
          )}

          <button
            type="button"
            disabled={busy}
            onClick={onSelectBlank}
            className="text-left"
          >
            <Card className="h-full hover:border-primary/40 hover:bg-muted/30">
              <CardHeader className="gap-2">
                <div className="flex items-center gap-2">
                  <PenLine className="size-4 text-primary" />
                  <CardTitle className="text-base">{t("notes.blankNote")}</CardTitle>
                </div>
                <CardDescription>{t("notes.blankDescription")}</CardDescription>
                {creatingBlank ? (
                  <CardDescription>{t("common.creating")}</CardDescription>
                ) : null}
              </CardHeader>
            </Card>
          </button>
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
