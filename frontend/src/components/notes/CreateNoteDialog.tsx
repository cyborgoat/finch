import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import {
  ClipboardList,
  Gavel,
  Mail,
  Notebook,
  PenLine,
  type LucideIcon,
} from "lucide-react"
import { BlurFade } from "@/components/motion-primitives/blur-fade"
import { JobProgress } from "@/components/jobs/JobProgress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useJobPolling } from "@/hooks/useJobPolling"
import { createAiAction, createDocument, listAiActionTemplates } from "@/lib/api"
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
  transcriptId: string
  llmReady: boolean
  onNoteCreated: (documentId: string) => void
}

export function CreateNoteDialog({
  open,
  onOpenChange,
  transcriptId,
  llmReady,
  onNoteCreated,
}: CreateNoteDialogProps) {
  const queryClient = useQueryClient()
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ["ai-actions", "templates"],
    queryFn: listAiActionTemplates,
    enabled: open,
  })

  const [jobId, setJobId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [creatingBlank, setCreatingBlank] = useState(false)

  const busy = !!jobId || creatingBlank

  const { job, error } = useJobPolling(jobId, {
    enabled: !!jobId,
    onCompleted: (nextJob) => {
      setJobId(null)
      setPendingAction(null)
      void queryClient.invalidateQueries({ queryKey: ["documents"] })
      void queryClient.invalidateQueries({ queryKey: ["files"] })
      if (nextJob.resultId) {
        onNoteCreated(nextJob.resultId)
        onOpenChange(false)
      }
    },
    onFailed: () => {
      setJobId(null)
      setPendingAction(null)
    },
  })

  const handleAiTemplate = async (template: AiActionTemplate) => {
    if (!llmReady || busy) return
    setPendingAction(template.id)
    try {
      const { jobId: newJobId } = await createAiAction({
        transcriptId,
        action: template.id,
        source: "editedText",
      })
      setJobId(newJobId)
    } catch (err) {
      setPendingAction(null)
      toast.error(err instanceof Error ? err.message : "Failed to start AI note")
    }
  }

  const handleBlankNote = async () => {
    if (busy) return
    setCreatingBlank(true)
    try {
      const document = await createDocument({ transcriptId })
      onNoteCreated(document.id)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create note")
    } finally {
      setCreatingBlank(false)
    }
  }

  const templates = templatesData?.items ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create note</DialogTitle>
          <DialogDescription>
            Generate a note with AI or start from a blank page.
          </DialogDescription>
        </DialogHeader>

        {busy ? (
          <BlurFade>
            <JobProgress job={job} error={error} />
          </BlurFade>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Loading templates…
              </p>
            ) : (
              templates.map((template) => {
                const Icon = TEMPLATE_ICONS[template.id] ?? Notebook
                return (
                  <button
                    key={template.id}
                    type="button"
                    disabled={!llmReady || busy}
                    onClick={() => void handleAiTemplate(template)}
                    className={cn(
                      "text-left transition-opacity",
                      !llmReady && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <Card className="h-full hover:border-primary/40 hover:bg-muted/30">
                      <CardHeader className="gap-2">
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 text-primary" />
                          <CardTitle className="text-base">{template.title}</CardTitle>
                        </div>
                        <CardDescription>{template.description}</CardDescription>
                        {pendingAction === template.id ? (
                          <CardDescription>Starting…</CardDescription>
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
              onClick={() => void handleBlankNote()}
              className="text-left"
            >
              <Card className="h-full hover:border-primary/40 hover:bg-muted/30">
                <CardHeader className="gap-2">
                  <div className="flex items-center gap-2">
                    <PenLine className="size-4 text-primary" />
                    <CardTitle className="text-base">Blank note</CardTitle>
                  </div>
                  <CardDescription>
                    Start with an empty note and write your own markdown.
                  </CardDescription>
                </CardHeader>
              </Card>
            </button>
          </div>
        )}

        {!llmReady && !busy ? (
          <p className="text-sm text-muted-foreground">
            AI templates require an LLM provider in Settings. Blank notes are always available.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
