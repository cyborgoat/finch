import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useUpdateNote } from "@/hooks/useNotes"
import { useUserPreferences } from "@/hooks/useUserPreferences"
import type { Note } from "@/lib/types"

const MdxEditorCore = lazy(() =>
  import("@/components/documents/MdxEditorCore").then((module) => ({
    default: module.InitializedMDXEditor,
  })),
)

type SaveStatus = "saved" | "saving" | "unsaved"

type MdxNoteEditorProps = {
  note: Note
  hideTitle?: boolean
  onDirtyChange?: (dirty: boolean) => void
  onDelete?: () => void
  deletePending?: boolean
}

export function MdxNoteEditor({
  note,
  hideTitle = false,
  onDirtyChange,
  onDelete,
  deletePending = false,
}: MdxNoteEditorProps) {
  const { t } = useTranslation()
  const saveTimerRef = useRef<number | null>(null)
  const updateMutation = useUpdateNote(note.id)
  const { preferences, updatePreferences } = useUserPreferences()

  const [title, setTitle] = useState(note.title)
  const [savedTitle, setSavedTitle] = useState(note.title)
  const [savedMarkdown, setSavedMarkdown] = useState(note.markdown)
  const [draftMarkdown, setDraftMarkdown] = useState(note.markdown)
  const [editorSeed, setEditorSeed] = useState(note.markdown)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")

  const autoSave = preferences.notesAutoSave
  const titleDirty = title.trim() !== savedTitle.trim()
  const markdownDirty = draftMarkdown !== savedMarkdown
  const dirty = hideTitle ? markdownDirty : titleDirty || markdownDirty

  useEffect(() => {
    setTitle(note.title)
    setSavedTitle(note.title)
    setSavedMarkdown(note.markdown)
    setDraftMarkdown(note.markdown)
    setEditorSeed(note.markdown)
    setSaveStatus("saved")
  }, [note.id])

  useEffect(() => {
    onDirtyChange?.(saveStatus === "unsaved" || dirty)
  }, [dirty, onDirtyChange, saveStatus])

  const persist = useCallback(
    async (nextTitle: string, nextMarkdown: string) => {
      setSaveStatus("saving")
      try {
        const resolvedTitle = nextTitle.trim() || t("notes.untitledNote")
        await updateMutation.mutateAsync({
          title: resolvedTitle,
          markdown: nextMarkdown,
        })
        setTitle(resolvedTitle)
        setSavedTitle(resolvedTitle)
        setSavedMarkdown(nextMarkdown)
        setDraftMarkdown(nextMarkdown)
        setSaveStatus("saved")
      } catch (err) {
        setSaveStatus("unsaved")
        toast.error(err instanceof Error ? err.message : t("toasts.failedToSaveNote"))
      }
    },
    [t, updateMutation],
  )

  const scheduleAutoSave = useCallback(
    (nextTitle: string, nextMarkdown: string) => {
      if (!autoSave) return
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
      setSaveStatus("unsaved")
      saveTimerRef.current = window.setTimeout(() => {
        void persist(nextTitle, nextMarkdown)
      }, 800)
    },
    [autoSave, persist],
  )

  useEffect(
    () => () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
    },
    [],
  )

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (autoSave) {
      scheduleAutoSave(value, draftMarkdown)
    } else {
      setSaveStatus("unsaved")
    }
  }

  const handleMarkdownChange = (nextMarkdown: string) => {
    setDraftMarkdown(nextMarkdown)
    if (autoSave) {
      scheduleAutoSave(hideTitle ? note.title : title, nextMarkdown)
    } else {
      setSaveStatus("unsaved")
    }
  }

  const handleManualSave = () => {
    void persist(hideTitle ? note.title : title, draftMarkdown)
  }

  const handleAutoSaveToggle = (checked: boolean) => {
    void updatePreferences({ notesAutoSave: checked }).catch(() => {
      toast.error(t("toasts.failedToUpdateAutoSave"))
    })
    if (checked && (saveStatus === "unsaved" || dirty)) {
      scheduleAutoSave(hideTitle ? note.title : title, draftMarkdown)
    }
  }

  const statusLabel =
    saveStatus === "saving"
      ? t("common.saving")
      : saveStatus === "unsaved" || dirty
        ? t("notes.editorStatusUnsaved")
        : t("notes.editorStatusSaved")

  return (
    <div className="field-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!hideTitle ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Label htmlFor={`note-title-${note.id}`} className="sr-only">
              {t("notes.editorNoteTitleAriaLabel")}
            </Label>
            <Input
              id={`note-title-${note.id}`}
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              className="max-w-md font-medium"
              placeholder={t("notes.editorNoteTitlePlaceholder")}
            />
          </div>
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id={`auto-save-${note.id}`}
              checked={autoSave}
              onCheckedChange={handleAutoSaveToggle}
            />
            <Label htmlFor={`auto-save-${note.id}`} className="text-sm text-muted-foreground">
              {t("notes.editorAutoSave")}
            </Label>
          </div>
          {onDelete ? (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={t("notes.editorDeleteAriaLabel")}
              disabled={deletePending}
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
          {!autoSave ? (
            <Button
              type="button"
              size="sm"
              onClick={handleManualSave}
              disabled={updateMutation.isPending || (!dirty && saveStatus !== "unsaved")}
            >
              {t("common.save")}
            </Button>
          ) : null}
          <span className="text-xs text-muted-foreground">{statusLabel}</span>
        </div>
      </div>

      <div className="mdx-note-editor overflow-hidden rounded-lg border border-border bg-background">
        <Suspense
          fallback={<Skeleton className="min-h-[480px] w-full rounded-lg" />}
        >
          <MdxEditorCore
            key={note.id}
            markdown={editorSeed}
            onChange={handleMarkdownChange}
            contentEditableClassName="mdx-note-content min-h-[480px] px-4 py-3 text-sm leading-relaxed"
          />
        </Suspense>
      </div>
    </div>
  )
}
