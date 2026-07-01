import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { VoiceprintEnrollmentPanel } from "@/components/voiceprints/VoiceprintEnrollmentPanel"

type VoiceprintEnrollmentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  ready: boolean
  notReadyReason?: string | null
  consentGiven: boolean
  disabled?: boolean
  defaultDisplayName?: string
  uiLanguage: "en" | "zh"
  forUserProfile?: boolean
  onConsentRequired: () => void
  onEnrolled?: (voiceprintProfileId: string) => void
}

export function VoiceprintEnrollmentDialog({
  open,
  onOpenChange,
  forUserProfile = false,
  onEnrolled,
  ...panelProps
}: VoiceprintEnrollmentDialogProps) {
  const { t } = useTranslation()

  const handleEnrolled = (voiceprintProfileId: string) => {
    onEnrolled?.(voiceprintProfileId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {forUserProfile
              ? t("settings.recordMyVoiceprint")
              : t("voiceprints.enrollmentTitle")}
          </DialogTitle>
          <DialogDescription>
            {forUserProfile
              ? t("settings.recordMyVoiceprintDescription")
              : t("voiceprints.enrollmentDescription")}
          </DialogDescription>
        </DialogHeader>
        <VoiceprintEnrollmentPanel
          {...panelProps}
          inDialog
          forUserProfile={forUserProfile}
          onEnrolled={handleEnrolled}
        />
      </DialogContent>
    </Dialog>
  )
}
