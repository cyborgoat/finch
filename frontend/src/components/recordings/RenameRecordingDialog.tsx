import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
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

type RenameRecordingDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onTitleChange: (title: string) => void
  onSave: () => void | Promise<void>
  inputId?: string
  isPending?: boolean
}

export function RenameRecordingDialog({
  open,
  onOpenChange,
  title,
  onTitleChange,
  onSave,
  inputId = "recording-rename-title",
  isPending,
}: RenameRecordingDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("recordings.renameTitle")}</DialogTitle>
          <DialogDescription>{t("recordings.renameDescription")}</DialogDescription>
        </DialogHeader>
        <div className="field-stack py-2">
          <Label htmlFor={inputId}>{t("common.title")}</Label>
          <Input
            id={inputId}
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void onSave()
            }}
            disabled={isPending}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void onSave()} disabled={isPending || !title.trim()}>
            {isPending ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
