import { Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BlurFade } from "@/components/motion-primitives/blur-fade";
import { EmptyState } from "@/components/effects/EmptyState";
import { MdxNoteEditor } from "@/components/documents/MdxNoteEditor";
import { CreateNoteDialog } from "@/components/notes/CreateNoteDialog";
import { NoteGeneratingPlaceholder } from "@/components/notes/NoteGeneratingPlaceholder";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteDocument, useUpdateDocument } from "@/hooks/useDocuments";
import { useJobPolling } from "@/hooks/useJobPolling";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { createAiAction, createDocument, getDocument } from "@/lib/api";
import { seedDocumentInCache } from "@/lib/documentCache";
import type { AiActionTemplate, Document, DocumentSummary } from "@/lib/types";

type TranscriptNotesTabProps = {
  transcriptId: string;
  documents: DocumentSummary[];
  llmReady?: boolean;
  activeNoteId: string | null;
  activeNote?: Document;
  noteLoading?: boolean;
  onNoteIdChange?: (noteId: string | null) => void;
};

export function TranscriptNotesTab({
  transcriptId,
  documents,
  llmReady = true,
  activeNoteId,
  activeNote,
  noteLoading = false,
  onNoteIdChange,
}: TranscriptNotesTabProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { preferences } = useUserPreferences();
  const deleteMutation = useDeleteDocument();
  const updateMutation = useUpdateDocument(activeNoteId ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false);
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [creatingBlank, setCreatingBlank] = useState(false);

  const generatingJobId =
    activeNote?.status === "generating" ? activeNote.generationJobId ?? null : null;

  const handleGenerationCompleted = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["documents"] });
    void queryClient.invalidateQueries({ queryKey: ["files"] });
    setEditorDirty(false);
    toast.success(
      t("toasts.noteReady", { title: activeNote?.title ?? t("common.note") }),
    );
  }, [activeNote?.title, queryClient, t]);

  const handleGenerationFailed = useCallback(
    (failedJob: { error?: string | null }) => {
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.error(failedJob.error ?? t("toasts.generateNoteFailed"));
    },
    [queryClient, t],
  );

  const { job: generationJob, error: generationError } = useJobPolling(
    generatingJobId,
    {
      enabled: !!generatingJobId,
      onCompleted: handleGenerationCompleted,
      onFailed: handleGenerationFailed,
    },
  );

  const showGeneratingPlaceholder = activeNote?.status === "generating";
  const showFailedPlaceholder = activeNote?.status === "failed";

  const notes = useMemo(
    () =>
      [...documents].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      ),
    [documents],
  );

  const noteItems = useMemo(
    () =>
      notes.map((note) => ({
        value: note.id,
        label:
          note.status === "generating"
            ? t("notes.generatingLabel", { title: note.title })
            : note.status === "failed"
              ? t("notes.failedLabel", { title: note.title })
              : note.title,
      })),
    [notes, t],
  );

  const activeNoteSummary = notes.find((note) => note.id === activeNoteId);
  const noteActionsBusy =
    deleteMutation.isPending || updateMutation.isPending;

  const selectNote = useCallback(
    (noteId: string) => {
      if (noteId === activeNoteId) return;
      if (!preferences.notesAutoSave && editorDirty) {
        setPendingNoteId(noteId);
        setSwitchConfirmOpen(true);
        return;
      }
      onNoteIdChange?.(noteId);
      setEditorDirty(false);
    },
    [
      activeNoteId,
      editorDirty,
      onNoteIdChange,
      preferences.notesAutoSave,
    ],
  );

  const handleDelete = async () => {
    if (!activeNoteId) return;
    try {
      await deleteMutation.mutateAsync(activeNoteId);
      toast.success(t("toasts.noteDeleted"));
      const remaining = notes.filter((note) => note.id !== activeNoteId);
      onNoteIdChange?.(remaining[0]?.id ?? null);
      setEditorDirty(false);
      setDeleteOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toasts.deleteNoteFailed"));
    }
  };

  const handleNoteCreated = (documentId: string) => {
    onNoteIdChange?.(documentId);
    setEditorDirty(false);
  };

  const handleSelectTemplate = async (template: AiActionTemplate) => {
    if (!llmReady || pendingTemplateId) return;
    setPendingTemplateId(template.id);
    try {
      const { documentId } = await createAiAction({
        transcriptId,
        action: template.id,
        source: "editedText",
      });
      const document = await getDocument(documentId);
      seedDocumentInCache(queryClient, transcriptId, document);
      setCreateOpen(false);
      handleNoteCreated(documentId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toasts.startAiNoteFailed"));
    } finally {
      setPendingTemplateId(null);
    }
  };

  const handleSelectBlank = async () => {
    if (creatingBlank) return;
    setCreatingBlank(true);
    try {
      const document = await createDocument({ transcriptId });
      seedDocumentInCache(queryClient, transcriptId, document);
      setCreateOpen(false);
      handleNoteCreated(document.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toasts.createNoteFailed"));
    } finally {
      setCreatingBlank(false);
    }
  };

  const handleNoteSelect = (noteId: string | null) => {
    if (!noteId || noteId === activeNoteId) return;
    selectNote(noteId);
  };

  const openRename = () => {
    const title =
      activeNote?.title ?? activeNoteSummary?.title ?? t("notes.untitledNote");
    setRenameTitle(title);
    setRenameOpen(true);
  };

  const handleRename = async () => {
    const trimmed = renameTitle.trim();
    if (!activeNoteId || !trimmed) return;

    const currentTitle =
      activeNote?.title ?? activeNoteSummary?.title ?? t("notes.untitledNote");
    if (trimmed === currentTitle) {
      setRenameOpen(false);
      return;
    }

    try {
      await updateMutation.mutateAsync({ title: trimmed });
      toast.success(t("toasts.noteRenamed"));
      setRenameOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toasts.renameNoteFailed"));
    }
  };

  return (
    <BlurFade className="section-stack">
      {!llmReady ? (
        <div className="surface-card text-sm text-muted-foreground">
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
        </div>
      ) : null}

      {notes.length > 0 || activeNoteId ? (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Select
              value={activeNoteId ?? undefined}
              onValueChange={handleNoteSelect}
              items={noteItems}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder={t("notes.selectNote")} />
              </SelectTrigger>
              <SelectContent
                align="start"
                alignItemWithTrigger={false}
                className="max-h-80 min-w-64"
              >
                {noteItems.map((item) => (
                  <SelectItem key={item.value} value={item.value} label={item.label}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 shrink-0"
                  aria-label={t("notes.actionsAriaLabel")}
                  disabled={!activeNoteId || noteActionsBusy || showGeneratingPlaceholder}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openRename} disabled={noteActionsBusy}>
                <Pencil />
                {t("notes.renameNote")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={noteActionsBusy}
              >
                <Trash2 />
                {t("notes.deleteNote")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 shrink-0"
            aria-label={t("notes.newNoteAriaLabel")}
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      ) : null}

      {showGeneratingPlaceholder ? (
        <NoteGeneratingPlaceholder
          templateTitle={activeNote?.title ?? t("common.note")}
          job={generationJob}
          error={generationError}
        />
      ) : showFailedPlaceholder ? (
        <EmptyState
          title={t("notes.failedTitle")}
          description={t("notes.failedDescription")}
          action={
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(true)}>
              {t("notes.deleteNote")}
            </Button>
          }
        />
      ) : noteLoading ? (
        <Skeleton className="min-h-[520px] w-full rounded-lg" />
      ) : activeNote ? (
        <MdxNoteEditor
          key={activeNote.id}
          document={activeNote}
          hideTitle
          onDirtyChange={setEditorDirty}
        />
      ) : (
        <EmptyState
          title={t("notes.emptyTitle")}
          description={t("notes.emptyDescription")}
          action={
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t("notes.createNote")}
            </Button>
          }
        />
      )}

      <CreateNoteDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        llmReady={llmReady}
        pendingTemplateId={pendingTemplateId}
        creatingBlank={creatingBlank}
        onSelectTemplate={(template) => void handleSelectTemplate(template)}
        onSelectBlank={() => void handleSelectBlank()}
      />

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("notes.renameTitle")}</DialogTitle>
            <DialogDescription>{t("notes.renameDescription")}</DialogDescription>
          </DialogHeader>
          <div className="field-stack py-2">
            <Label htmlFor="note-rename-title">{t("common.title")}</Label>
            <Input
              id="note-rename-title"
              value={renameTitle}
              onChange={(event) => setRenameTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleRename();
              }}
              disabled={updateMutation.isPending}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameOpen(false)}
              disabled={updateMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => void handleRename()}
              disabled={updateMutation.isPending || !renameTitle.trim()}
            >
              {updateMutation.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("notes.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("notes.deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => void handleDelete()}
            >
              {deleteMutation.isPending ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={switchConfirmOpen} onOpenChange={setSwitchConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("notes.discardTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("notes.discardDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("notes.discardKeepEditing")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingNoteId) {
                  onNoteIdChange?.(pendingNoteId);
                  setEditorDirty(false);
                }
                setPendingNoteId(null);
                setSwitchConfirmOpen(false);
              }}
            >
              {t("notes.discardConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BlurFade>
  );
}
