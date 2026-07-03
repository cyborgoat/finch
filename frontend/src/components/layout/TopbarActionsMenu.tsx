import { useState } from "react"
import { MoreHorizontal, Pencil, RefreshCw, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useTopbarActions } from "@/components/layout/TopbarActionsContext"
import { ConfirmDeleteDialog } from "@/components/recordings/ConfirmDeleteDialog"
import { RenameRecordingDialog } from "@/components/recordings/RenameRecordingDialog"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function TopbarActionsMenu() {
  const { t } = useTranslation()
  const { actions } = useTopbarActions()
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const [title, setTitle] = useState("")

  if (!actions) return null

  const busy = actions.isRenaming || actions.isDeleting || actions.isRegenerating

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
              aria-label={t("recordings.actionsAriaLabel")}
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
          {actions.onRegenerateTranscription ? (
            <>
              <DropdownMenuItem
                onClick={() => setRegenerateOpen(true)}
                disabled={busy}
              >
                <RefreshCw />
                {t("recordings.regenerateTranscription")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
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
            {t("recordings.deleteRecording")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameRecordingDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title={title}
        onTitleChange={setTitle}
        onSave={handleRename}
        isPending={actions.isRenaming}
      />

      {actions.onRegenerateTranscription ? (
        <AlertDialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("recordings.regenerateTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("recordings.regenerateDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                disabled={actions.isRegenerating}
                onClick={() => {
                  void actions.onRegenerateTranscription?.()
                  setRegenerateOpen(false)
                }}
              >
                {t("recordings.regenerateTranscription")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("recordings.deleteTitle")}
        description={t("recordings.deleteDescription")}
        confirmLabel={t("recordings.deleteRecording")}
        isPending={actions.isDeleting}
        onConfirm={() => {
          actions.onDelete()
          setDeleteOpen(false)
        }}
      />
    </>
  )
}
