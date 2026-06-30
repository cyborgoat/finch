import { MoreHorizontal } from "lucide-react"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { TranscriptSummary } from "@/lib/types"

type TranscriptRowActionsProps = {
  item: TranscriptSummary
  onRename: (id: string, title: string) => void | Promise<void>
  onDelete: (id: string) => void
  isRenaming?: boolean
  isDeleting?: boolean
}

export function TranscriptRowActions({
  item,
  onRename,
  onDelete,
  isRenaming,
  isDeleting,
}: TranscriptRowActionsProps) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [title, setTitle] = useState(item.title)
  const busy = isRenaming || isDeleting

  const openRename = () => {
    setTitle(item.title)
    setRenameOpen(true)
  }

  const handleRename = async () => {
    const trimmed = title.trim()
    if (!trimmed) return
    if (trimmed === item.title) {
      setRenameOpen(false)
      return
    }
    await onRename(item.id, trimmed)
    setRenameOpen(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Transcript actions"
              disabled={busy}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={openRename}>
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename transcript</DialogTitle>
            <DialogDescription>
              Update the title shown in your transcript library.
            </DialogDescription>
          </DialogHeader>
          <div className="field-stack py-2">
            <Label htmlFor={`rename-${item.id}`}>Title</Label>
            <Input
              id={`rename-${item.id}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleRename()
              }}
              disabled={isRenaming}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameOpen(false)}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleRename()}
              disabled={isRenaming || !title.trim()}
            >
              {isRenaming ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transcript?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the transcript and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                onDelete(item.id)
                setDeleteOpen(false)
              }}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
