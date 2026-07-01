import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useUpdateDocument } from "@/hooks/useDocuments"
import { useUserPreferences } from "@/hooks/useUserPreferences"
import type { Document } from "@/lib/types"

const MdxEditorCore = lazy(() =>
  import("@/components/documents/MdxEditorCore").then((module) => ({
    default: module.InitializedMDXEditor,
  })),
)

type SaveStatus = "saved" | "saving" | "unsaved"

type MdxNoteEditorProps = {
  document: Document
  hideTitle?: boolean
  onDirtyChange?: (dirty: boolean) => void
  onDelete?: () => void
  deletePending?: boolean
}

export function MdxNoteEditor({
  document,
  hideTitle = false,
  onDirtyChange,
  onDelete,
  deletePending = false,
}: MdxNoteEditorProps) {
  const saveTimerRef = useRef<number | null>(null)
  const updateMutation = useUpdateDocument(document.id)
  const { preferences, updatePreferences } = useUserPreferences()

  const [title, setTitle] = useState(document.title)
  const [savedTitle, setSavedTitle] = useState(document.title)
  const [savedMarkdown, setSavedMarkdown] = useState(document.markdown)
  const [draftMarkdown, setDraftMarkdown] = useState(document.markdown)
  const [editorSeed, setEditorSeed] = useState(document.markdown)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")

  const autoSave = preferences.notesAutoSave
  const titleDirty = title.trim() !== savedTitle.trim()
  const markdownDirty = draftMarkdown !== savedMarkdown
  const dirty = hideTitle ? markdownDirty : titleDirty || markdownDirty

  useEffect(() => {
    setTitle(document.title)
    setSavedTitle(document.title)
    setSavedMarkdown(document.markdown)
    setDraftMarkdown(document.markdown)
    setEditorSeed(document.markdown)
    setSaveStatus("saved")
  }, [document.id])

  useEffect(() => {
    onDirtyChange?.(saveStatus === "unsaved" || dirty)
  }, [dirty, onDirtyChange, saveStatus])

  const persist = useCallback(
    async (nextTitle: string, nextMarkdown: string) => {
      setSaveStatus("saving")
      try {
        const resolvedTitle = nextTitle.trim() || "Untitled note"
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
        toast.error(err instanceof Error ? err.message : "Failed to save note")
      }
    },
    [updateMutation],
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
      scheduleAutoSave(hideTitle ? document.title : title, nextMarkdown)
    } else {
      setSaveStatus("unsaved")
    }
  }

  const handleManualSave = () => {
    void persist(hideTitle ? document.title : title, draftMarkdown)
  }

  const handleAutoSaveToggle = (checked: boolean) => {
    void updatePreferences({ notesAutoSave: checked }).catch(() => {
      toast.error("Failed to update auto-save setting")
    })
    if (checked && (saveStatus === "unsaved" || dirty)) {
      scheduleAutoSave(hideTitle ? document.title : title, draftMarkdown)
    }
  }

  const statusLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "unsaved" || dirty
        ? "Unsaved changes"
        : "Saved"

  return (
    <div className="field-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!hideTitle ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Label htmlFor={`note-title-${document.id}`} className="sr-only">
              Note title
            </Label>
            <Input
              id={`note-title-${document.id}`}
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              className="max-w-md font-medium"
              placeholder="Note title"
            />
          </div>
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id={`auto-save-${document.id}`}
              checked={autoSave}
              onCheckedChange={handleAutoSaveToggle}
            />
            <Label htmlFor={`auto-save-${document.id}`} className="text-sm text-muted-foreground">
              Auto-save
            </Label>
          </div>
          {onDelete ? (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Delete note"
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
              Save
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
            key={document.id}
            markdown={editorSeed}
            onChange={handleMarkdownChange}
            contentEditableClassName="mdx-note-content min-h-[480px] px-4 py-3 text-sm leading-relaxed"
          />
        </Suspense>
      </div>
    </div>
  )
}
