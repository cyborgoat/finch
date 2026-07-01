import { Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BlurFade } from "@/components/motion-primitives/blur-fade";
import { EmptyState } from "@/components/effects/EmptyState";
import { MdxNoteEditor } from "@/components/documents/MdxNoteEditor";
import { CreateNoteDialog } from "@/components/notes/CreateNoteDialog";
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
import { useUserPreferences } from "@/hooks/useUserPreferences";
import type { Document, DocumentSummary } from "@/lib/types";

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

  const notes = useMemo(
    () =>
      [...documents].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      ),
    [documents],
  );

  const noteItems = useMemo(
    () => notes.map((note) => ({ value: note.id, label: note.title })),
    [notes],
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
      toast.success("Note deleted");
      const remaining = notes.filter((note) => note.id !== activeNoteId);
      onNoteIdChange?.(remaining[0]?.id ?? null);
      setEditorDirty(false);
      setDeleteOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete note");
    }
  };

  const handleNoteCreated = (documentId: string) => {
    onNoteIdChange?.(documentId);
    setEditorDirty(false);
  };

  const handleNoteSelect = (noteId: string | null) => {
    if (!noteId || noteId === activeNoteId) return;
    selectNote(noteId);
  };

  const openRename = () => {
    const title =
      activeNote?.title ?? activeNoteSummary?.title ?? "Untitled note";
    setRenameTitle(title);
    setRenameOpen(true);
  };

  const handleRename = async () => {
    const trimmed = renameTitle.trim();
    if (!activeNoteId || !trimmed) return;

    const currentTitle =
      activeNote?.title ?? activeNoteSummary?.title ?? "Untitled note";
    if (trimmed === currentTitle) {
      setRenameOpen(false);
      return;
    }

    try {
      await updateMutation.mutateAsync({ title: trimmed });
      toast.success("Note renamed");
      setRenameOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename note");
    }
  };

  return (
    <BlurFade className="section-stack">
      {!llmReady ? (
        <div className="surface-card text-sm text-muted-foreground">
          AI note templates require an LLM provider. Configure{" "}
          <Link to="/settings" className="underline underline-offset-2">
            Settings → LLM provider
          </Link>
          . Blank notes are always available.
        </div>
      ) : null}

      {notes.length > 0 ? (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Select
              value={activeNoteId ?? undefined}
              onValueChange={handleNoteSelect}
              items={noteItems}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select note" />
              </SelectTrigger>
              <SelectContent
                align="start"
                alignItemWithTrigger={false}
                className="max-h-80 min-w-64"
              >
                {notes.map((note) => (
                  <SelectItem key={note.id} value={note.id} label={note.title}>
                    {note.title}
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
                  aria-label="Note actions"
                  disabled={!activeNoteId || noteActionsBusy}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openRename} disabled={noteActionsBusy}>
                <Pencil />
                Rename note
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={noteActionsBusy}
              >
                <Trash2 />
                Delete note
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 shrink-0"
            aria-label="New note"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      ) : null}

      {noteLoading ? (
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
          title="No notes yet"
          description="Create a note from an AI template or start with a blank page."
          action={
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Create note
            </Button>
          }
        />
      )}

      <CreateNoteDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        transcriptId={transcriptId}
        llmReady={llmReady}
        onNoteCreated={handleNoteCreated}
      />

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename note</DialogTitle>
            <DialogDescription>
              Update the name shown in the note list.
            </DialogDescription>
          </DialogHeader>
          <div className="field-stack py-2">
            <Label htmlFor="note-rename-title">Title</Label>
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
              Cancel
            </Button>
            <Button
              onClick={() => void handleRename()}
              disabled={updateMutation.isPending || !renameTitle.trim()}
            >
              {updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected note from this recording.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => void handleDelete()}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={switchConfirmOpen} onOpenChange={setSwitchConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved edits. Switch notes without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
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
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BlurFade>
  );
}
