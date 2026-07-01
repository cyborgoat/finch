
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

type VoiceprintConsentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending?: boolean
}

export function VoiceprintConsentDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: VoiceprintConsentDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("voiceprints.consentTitle")}</DialogTitle>
          <DialogDescription className="space-y-2 pt-1">
            <span className="block">{t("voiceprints.consentBody1")}</span>
            <span className="block">{t("voiceprints.consentBody2")}</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? t("common.saving") : t("voiceprints.consentConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
