
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

type DeleteConfirmDialogProps = {
  title: string
  description: string
  onConfirm: () => void
  triggerLabel?: string
  confirmLabel?: string
  isPending?: boolean
  variant?: "destructive" | "ghost" | "outline"
}

export function DeleteConfirmDialog({
  title,
  description,
  onConfirm,
  triggerLabel,
  confirmLabel,
  isPending,
  variant = "destructive",
}: DeleteConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant={variant} size="sm" disabled={isPending}>
            {triggerLabel ?? t("common.delete")}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? t("common.deleting") : (confirmLabel ?? t("common.delete"))}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
