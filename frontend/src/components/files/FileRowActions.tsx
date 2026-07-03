import { MoreHorizontal } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
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
import type { RecordingListItem } from "@/lib/recordings"

type RecordingRowActionsProps = {
  item: RecordingListItem
  onRename?: (id: string, title: string) => void | Promise<void>
  onDelete: (id: string) => void
  onTranscribe?: (id: string, options?: { regenerate?: boolean }) => void | Promise<void>
  isRenaming?: boolean
  isDeleting?: boolean
  isTranscribing?: boolean
}

export function RecordingRowActions({
  item,
  onRename,
  onDelete,
  onTranscribe,
  isRenaming,
  isDeleting,
  isTranscribing,
}: RecordingRowActionsProps) {
  const { t } = useTranslation()
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const [title, setTitle] = useState(item.title)
  const busy = isRenaming || isDeleting || isTranscribing
  const isItemTranscribing = item.status === "transcribing"
  const canRegenerate = onTranscribe && item.status === "draft"

  if (isItemTranscribing) return null

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
          {canRegenerate ? (
            <>
              <DropdownMenuItem onClick={() => setRegenerateOpen(true)}>
                {t("recordings.regenerateTranscription")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
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
        <RenameRecordingDialog
          open={renameOpen}
          onOpenChange={setRenameOpen}
          title={title}
          onTitleChange={setTitle}
          onSave={handleRename}
          inputId={`rename-${item.id}`}
          isPending={isRenaming}
        />
      ) : null}

      {canRegenerate ? (
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
                disabled={isTranscribing}
                onClick={() => {
                  void onTranscribe(item.id, { regenerate: true })
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
        isPending={isDeleting}
        onConfirm={() => {
          onDelete(item.id)
          setDeleteOpen(false)
        }}
      />
    </>
  )
}
