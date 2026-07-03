import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { NoteSummary } from "@/lib/types"
import { cn } from "@/lib/utils"

type NoteCardGridProps = {
  notes: NoteSummary[]
  onSelect: (noteId: string) => void
  onCreate: () => void
  onRename: (noteId: string) => void
  onDelete: (noteId: string) => void
  actionsDisabled?: boolean
}

function noteDisplayTitle(
  note: NoteSummary,
  t: (key: string, options?: Record<string, string>) => string,
) {
  if (note.status === "generating") {
    return t("notes.generatingLabel", { title: note.title })
  }
  if (note.status === "failed") {
    return t("notes.failedLabel", { title: note.title })
  }
  return note.title
}

function NoteCard({
  note,
  actionsDisabled,
  onSelect,
  onRename,
  onDelete,
}: {
  note: NoteSummary
  actionsDisabled?: boolean
  onSelect: (noteId: string) => void
  onRename: (noteId: string) => void
  onDelete: (noteId: string) => void
}) {
  const { t } = useTranslation()
  const title = noteDisplayTitle(note, t)
  const updatedAt = new Date(note.updatedAt).toLocaleString()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(note.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelect(note.id)
        }
      }}
      className={cn(
        "group relative h-full rounded-lg bg-muted/20 p-4 text-left transition-colors",
        "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-base font-medium">{title}</p>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 data-[state=open]:opacity-100"
                aria-label={t("notes.cardActionsAriaLabel")}
                disabled={actionsDisabled}
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenuItem
              onClick={() => onRename(note.id)}
              disabled={actionsDisabled}
            >
              <Pencil />
              {t("notes.renameNote")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(note.id)}
              disabled={actionsDisabled}
            >
              <Trash2 />
              {t("notes.deleteNote")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {note.status === "generating" ? (
          <Badge variant="secondary">{t("notes.statusGenerating")}</Badge>
        ) : note.status === "failed" ? (
          <Badge variant="destructive">{t("notes.statusFailed")}</Badge>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {t("notes.updatedAt", { date: updatedAt })}
        </p>
      </div>
    </div>
  )
}

export function NoteCardGrid({
  notes,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  actionsDisabled,
}: NoteCardGridProps) {
  const { t } = useTranslation()

  return (
    <div className="field-stack">
      <p className="text-sm text-muted-foreground">
        {t("notes.noteCount", { count: notes.length })}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            actionsDisabled={actionsDisabled}
            onSelect={onSelect}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}

        <button
          type="button"
          onClick={onCreate}
          className={cn(
            "flex h-full min-h-[88px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border",
            "bg-muted/10 p-4 text-sm text-muted-foreground transition-colors",
            "hover:border-primary/40 hover:bg-muted/20 hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
          )}
        >
          <Plus className="size-5" />
          {t("notes.createNote")}
        </button>
      </div>
    </div>
  )
}
