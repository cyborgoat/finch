import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type NoteDialogsProps = {
  renameOpen: boolean
  onRenameOpenChange: (open: boolean) => void
  renameTitle: string
  onRenameTitleChange: (title: string) => void
  renamePending?: boolean
  onRename: () => void
  deleteOpen: boolean
  onDeleteOpenChange: (open: boolean) => void
  deletePending?: boolean
  onDelete: () => void
  switchConfirmOpen: boolean
  onSwitchConfirmOpenChange: (open: boolean) => void
  onSwitchConfirm: () => void
}

export function NoteDialogs({
  renameOpen,
  onRenameOpenChange,
  renameTitle,
  onRenameTitleChange,
  renamePending,
  onRename,
  deleteOpen,
  onDeleteOpenChange,
  deletePending,
  onDelete,
  switchConfirmOpen,
  onSwitchConfirmOpenChange,
  onSwitchConfirm,
}: NoteDialogsProps) {
  const { t } = useTranslation()

  return (
    <>
      <Dialog open={renameOpen} onOpenChange={onRenameOpenChange}>
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
              onChange={(event) => onRenameTitleChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onRename()
              }}
              disabled={renamePending}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onRenameOpenChange(false)}
              disabled={renamePending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={onRename}
              disabled={renamePending || !renameTitle.trim()}
            >
              {renamePending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={onDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("notes.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("notes.deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePending}
              onClick={onDelete}
            >
              {deletePending ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={switchConfirmOpen} onOpenChange={onSwitchConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("notes.discardTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("notes.discardDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("notes.discardKeepEditing")}</AlertDialogCancel>
            <AlertDialogAction onClick={onSwitchConfirm}>
              {t("notes.discardConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
