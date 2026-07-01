import { MoreHorizontal } from "lucide-react"
import { useState } from "react"
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
import type { RecordingListItem } from "@/lib/recordings"

type RecordingRowActionsProps = {
  item: RecordingListItem
  onRename?: (id: string, title: string) => void | Promise<void>
  onDelete: (id: string) => void
  isRenaming?: boolean
  isDeleting?: boolean
}

export function RecordingRowActions({
  item,
  onRename,
  onDelete,
  isRenaming,
  isDeleting,
}: RecordingRowActionsProps) {
  const { t } = useTranslation()
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [title, setTitle] = useState(item.title)
  const busy = isRenaming || isDeleting
  const isTranscribing = item.status === "transcribing"

  if (isTranscribing) return null

  const openRename = () => {
    setTitle(item.title)
    setRenameOpen(true)
  }

  const handleRename = async () => {
    const trimmed = title.trim()
    if (!trimmed || !onRename) return
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
              aria-label={t("recordings.actionsAriaLabel")}
              disabled={busy}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {onRename ? (
            <>
              <DropdownMenuItem onClick={openRename}>{t("common.rename")}</DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            {t("recordings.deleteRecording")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {onRename ? (
        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("recordings.renameTitle")}</DialogTitle>
              <DialogDescription>
                {t("recordings.renameDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="field-stack py-2">
              <Label htmlFor={`rename-${item.id}`}>{t("common.title")}</Label>
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
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => void handleRename()}
                disabled={isRenaming || !title.trim()}
              >
                {isRenaming ? t("common.saving") : t("common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("recordings.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("recordings.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                onDelete(item.id)
                setDeleteOpen(false)
              }}
            >
              {isDeleting ? t("common.deleting") : t("recordings.deleteRecording")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
