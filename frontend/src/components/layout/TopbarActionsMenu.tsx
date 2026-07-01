import { useState } from "react"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
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
import { useTopbarActions } from "@/components/layout/TopbarActionsContext"

export function TopbarActionsMenu() {
  const { t } = useTranslation()
  const { actions } = useTopbarActions()
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [title, setTitle] = useState("")

  if (!actions) return null

  const busy = actions.isRenaming || actions.isDeleting

  const openRename = () => {
    setTitle(actions.title)
    setRenameOpen(true)
  }

  const handleRename = async () => {
    const trimmed = title.trim()
    if (!trimmed) return
    if (trimmed === actions.title) {
      setRenameOpen(false)
      return
    }
    await actions.onRename(trimmed)
    setRenameOpen(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t("files.recordingActionsAriaLabel")}
              disabled={busy}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent
          align="end"
          className="w-auto min-w-48 p-1.5 [&_[data-slot=dropdown-menu-item]]:gap-2.5 [&_[data-slot=dropdown-menu-item]]:px-3 [&_[data-slot=dropdown-menu-item]]:py-2"
        >
          <DropdownMenuItem onClick={openRename} disabled={busy}>
            <Pencil />
            {t("common.rename")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={busy}
          >
            <Trash2 />
            {t("files.deleteSession")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("files.renameRecording")}</DialogTitle>
            <DialogDescription>
              {t("files.renameRecordingDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="field-stack py-2">
            <Label htmlFor="recording-rename-title">{t("common.title")}</Label>
            <Input
              id="recording-rename-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleRename()
              }}
              disabled={actions.isRenaming}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameOpen(false)}
              disabled={actions.isRenaming}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => void handleRename()}
              disabled={actions.isRenaming || !title.trim()}
            >
              {actions.isRenaming ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("files.deleteSessionTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("files.deleteSessionDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={actions.isDeleting}
              onClick={() => {
                actions.onDelete()
                setDeleteOpen(false)
              }}
            >
              {actions.isDeleting ? t("common.deleting") : t("files.deleteSession")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
