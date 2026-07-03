import { Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { BlurFade } from "@/components/motion-primitives/blur-fade";
import { EmptyState } from "@/components/effects/EmptyState";
import { MdxNoteEditor } from "@/components/documents/MdxNoteEditor";
import { CreateNoteDialog } from "@/components/notes/CreateNoteDialog";
import { NoteDialogs } from "@/components/notes/NoteDialogs";
import { NoteSelectToolbar } from "@/components/notes/NoteSelectToolbar";
import { NoteGeneratingPlaceholder } from "@/components/notes/NoteGeneratingPlaceholder";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteNote, useUpdateNote } from "@/hooks/useNotes";
import { useJobPolling } from "@/hooks/useJobPolling";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { createAiAction, createNote, getNote } from "@/lib/api";
import { seedNoteInCache } from "@/lib/noteCache";
import type { AiActionTemplate, Note, NoteSummary } from "@/lib/types";

type RecordingNotesTabProps = {
  recordingId: string;
  notes?: NoteSummary[];
  llmReady?: boolean;
  activeNoteId: string | null;
  activeNote?: Note;
  noteLoading?: boolean;
  onNoteIdChange?: (noteId: string | null) => void;
};

export function RecordingNotesTab({
  recordingId,
  notes: noteSummaries = [],
  llmReady = true,
  activeNoteId,
  activeNote,
  noteLoading = false,
  onNoteIdChange,
}: RecordingNotesTabProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { preferences } = useUserPreferences();
  const deleteMutation = useDeleteNote();
  const updateMutation = useUpdateNote(activeNoteId ?? "");
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

  const handleGenerationCompleted = useCallback(async () => {
    if (activeNoteId) {
      try {
        const note = await getNote(activeNoteId)
        seedNoteInCache(queryClient, recordingId, note)
      } catch {
        void queryClient.invalidateQueries({ queryKey: ["notes"] })
      }
    } else {
      void queryClient.invalidateQueries({ queryKey: ["notes"] })
    }
    void queryClient.invalidateQueries({ queryKey: ["recordings"] })
    setEditorDirty(false)
    toast.success(
      t("toasts.noteReady", { title: activeNote?.title ?? t("common.note") }),
    )
  }, [activeNote?.title, activeNoteId, queryClient, recordingId, t])

  const handleGenerationFailed = useCallback(
    (failedJob: { error?: string | null }) => {
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
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

  const showGeneratingPlaceholder =
    activeNote?.status === "generating" &&
    (!generationJob ||
      (generationJob.status !== "completed" && generationJob.status !== "failed"))
  const showFailedPlaceholder = activeNote?.status === "failed";

  const notes = useMemo(
    () =>
      [...noteSummaries].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      ),
    [noteSummaries],
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

  const handleNoteCreated = (noteId: string) => {
    onNoteIdChange?.(noteId);
    setEditorDirty(false);
  };

  const handleSelectTemplate = async (template: AiActionTemplate) => {
    if (!llmReady || pendingTemplateId) return;
    setPendingTemplateId(template.id);
    try {
      const { noteId } = await createAiAction({
        recordingId,
        action: template.id,
        source: "editedText",
      });
      const note = await getNote(noteId);
      seedNoteInCache(queryClient, recordingId, note);
      setCreateOpen(false);
      handleNoteCreated(noteId);
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
      const note = await createNote({ recordingId });
      seedNoteInCache(queryClient, recordingId, note);
      setCreateOpen(false);
      handleNoteCreated(note.id);
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
        <div className="rounded-lg bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
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
        <NoteSelectToolbar
          activeNoteId={activeNoteId}
          noteItems={noteItems}
          actionsDisabled={noteActionsBusy || showGeneratingPlaceholder}
          onNoteSelect={handleNoteSelect}
          onRename={openRename}
          onDelete={() => setDeleteOpen(true)}
          onCreate={() => setCreateOpen(true)}
        />
      ) : null}

      {showGeneratingPlaceholder ? (
        <div className="surface-card overflow-hidden border-0 p-0">
          <NoteGeneratingPlaceholder
            templateTitle={activeNote?.title ?? t("common.note")}
            job={generationJob}
            error={generationError}
          />
        </div>
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
        <Skeleton className="min-h-[520px] w-full rounded-xl" />
      ) : activeNote ? (
        <div className="surface-card overflow-hidden border-0 p-0">
          <MdxNoteEditor
            key={activeNote.id}
            note={activeNote}
            hideTitle
            embedded
            onDirtyChange={setEditorDirty}
          />
        </div>
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

      <NoteDialogs
        renameOpen={renameOpen}
        onRenameOpenChange={setRenameOpen}
        renameTitle={renameTitle}
        onRenameTitleChange={setRenameTitle}
        renamePending={updateMutation.isPending}
        onRename={() => void handleRename()}
        deleteOpen={deleteOpen}
        onDeleteOpenChange={setDeleteOpen}
        deletePending={deleteMutation.isPending}
        onDelete={() => void handleDelete()}
        switchConfirmOpen={switchConfirmOpen}
        onSwitchConfirmOpenChange={setSwitchConfirmOpen}
        onSwitchConfirm={() => {
          if (pendingNoteId) {
            onNoteIdChange?.(pendingNoteId);
            setEditorDirty(false);
          }
          setPendingNoteId(null);
          setSwitchConfirmOpen(false);
        }}
      />
    </BlurFade>
  );
}
