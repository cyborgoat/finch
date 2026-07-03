import { Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { BlurFade } from "@/components/motion-primitives/blur-fade";
import { EmptyState } from "@/components/effects/EmptyState";
import { MdxNoteEditor } from "@/components/documents/MdxNoteEditor";
import { CreateNoteDialog } from "@/components/notes/CreateNoteDialog";
import { NoteCardGrid } from "@/components/notes/NoteCardGrid";
import { NoteDialogs } from "@/components/notes/NoteDialogs";
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

type DiscardMode = "switch" | "back";

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
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false);
  const [discardMode, setDiscardMode] = useState<DiscardMode>("switch");
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null);
  const [targetNoteId, setTargetNoteId] = useState<string | null>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [creatingBlank, setCreatingBlank] = useState(false);

  const editNoteId = targetNoteId ?? activeNoteId ?? "";
  const updateMutation = useUpdateNote(editNoteId);

  const generatingJobId =
    activeNote?.status === "generating" ? activeNote.generationJobId ?? null : null;

  const handleGenerationCompleted = useCallback(async () => {
    if (activeNoteId) {
      try {
        const note = await getNote(activeNoteId);
        seedNoteInCache(queryClient, recordingId, note);
      } catch {
        void queryClient.invalidateQueries({ queryKey: ["notes"] });
      }
    } else {
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
    }
    void queryClient.invalidateQueries({ queryKey: ["recordings"] });
    setEditorDirty(false);
    toast.success(
      t("toasts.noteReady", { title: activeNote?.title ?? t("common.note") }),
    );
  }, [activeNote?.title, activeNoteId, queryClient, recordingId, t]);

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
      (generationJob.status !== "completed" && generationJob.status !== "failed"));
  const showFailedPlaceholder = activeNote?.status === "failed";

  const notes = useMemo(
    () =>
      [...noteSummaries].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      ),
    [noteSummaries],
  );

  const noteActionsBusy =
    deleteMutation.isPending || updateMutation.isPending;

  const getNoteTitle = useCallback(
    (noteId: string) => {
      const summary = notes.find((note) => note.id === noteId);
      return summary?.title ?? t("notes.untitledNote");
    },
    [notes, t],
  );


  const selectNote = useCallback(
    (noteId: string) => {
      if (noteId === activeNoteId) return;
      if (!preferences.notesAutoSave && editorDirty) {
        setDiscardMode("switch");
        setPendingNoteId(noteId);
        setSwitchConfirmOpen(true);
        return;
      }
      onNoteIdChange?.(noteId);
      setEditorDirty(false);
    },
    [activeNoteId, editorDirty, onNoteIdChange, preferences.notesAutoSave],
  );

  const handleBack = () => {
    if (!preferences.notesAutoSave && editorDirty) {
      setDiscardMode("back");
      setSwitchConfirmOpen(true);
      return;
    }
    onNoteIdChange?.(null);
    setEditorDirty(false);
  };

  const handleDelete = async () => {
    const noteIdToDelete = targetNoteId ?? activeNoteId;
    if (!noteIdToDelete) return;
    try {
      await deleteMutation.mutateAsync(noteIdToDelete);
      toast.success(t("toasts.noteDeleted"));
      if (noteIdToDelete === activeNoteId) {
        onNoteIdChange?.(null);
        setEditorDirty(false);
      }
      setTargetNoteId(null);
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

  const openRename = (noteId: string) => {
    setTargetNoteId(noteId);
    setRenameTitle(getNoteTitle(noteId));
    setRenameOpen(true);
  };

  const openDelete = (noteId: string) => {
    setTargetNoteId(noteId);
    setDeleteOpen(true);
  };

  const handleRename = async () => {
    const trimmed = renameTitle.trim();
    if (!editNoteId || !trimmed) return;

    const currentTitle = getNoteTitle(editNoteId);
    if (trimmed === currentTitle) {
      setRenameOpen(false);
      setTargetNoteId(null);
      return;
    }

    try {
      await updateMutation.mutateAsync({ title: trimmed });
      toast.success(t("toasts.noteRenamed"));
      setRenameOpen(false);
      setTargetNoteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toasts.renameNoteFailed"));
    }
  };

  const handleDiscardConfirm = () => {
    if (discardMode === "back") {
      onNoteIdChange?.(null);
      setEditorDirty(false);
    } else if (pendingNoteId) {
      onNoteIdChange?.(pendingNoteId);
      setEditorDirty(false);
    }
    setPendingNoteId(null);
    setSwitchConfirmOpen(false);
  };

  const discardTitle =
    discardMode === "back" ? t("notes.discardBackTitle") : t("notes.discardTitle");
  const discardDescription =
    discardMode === "back"
      ? t("notes.discardBackDescription")
      : t("notes.discardDescription");

  const isDetailView = !!activeNoteId;

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

      {!isDetailView ? (
        notes.length > 0 ? (
          <NoteCardGrid
            notes={notes}
            actionsDisabled={noteActionsBusy}
            onSelect={selectNote}
            onCreate={() => setCreateOpen(true)}
            onRename={openRename}
            onDelete={openDelete}
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
        )
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={handleBack}
            >
              <ChevronLeft className="size-4" />
              {t("notes.backToNotes")}
            </Button>
          </div>

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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openDelete(activeNoteId)}
                >
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
                onDelete={() => openDelete(activeNote.id)}
                deletePending={deleteMutation.isPending}
              />
            </div>
          ) : null}
        </>
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
        onRenameOpenChange={(open) => {
          setRenameOpen(open);
          if (!open) setTargetNoteId(null);
        }}
        renameTitle={renameTitle}
        onRenameTitleChange={setRenameTitle}
        renamePending={updateMutation.isPending}
        onRename={() => void handleRename()}
        deleteOpen={deleteOpen}
        onDeleteOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setTargetNoteId(null);
        }}
        deletePending={deleteMutation.isPending}
        onDelete={() => void handleDelete()}
        switchConfirmOpen={switchConfirmOpen}
        onSwitchConfirmOpenChange={setSwitchConfirmOpen}
        onSwitchConfirm={handleDiscardConfirm}
        discardTitle={discardTitle}
        discardDescription={discardDescription}
      />
    </BlurFade>
  );
}
