import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { VoiceprintEnrollmentPanel } from "@/components/voiceprints/VoiceprintEnrollmentPanel"
import type { VoiceprintProfileSummary } from "@/lib/types"

type VoiceprintEnrollmentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  ready: boolean
  notReadyReason?: string | null
  consentGiven: boolean
  disabled?: boolean
  profileDisplayName?: string
  existingProfileId?: string | null
  profiles?: VoiceprintProfileSummary[]
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {forUserProfile
              ? t("settings.recordMyVoiceprint")
              : t("voiceprints.enrollmentTitle")}
          </DialogTitle>
          <DialogDescription>
            {forUserProfile
              ? t("settings.recordMyVoiceprintDescription")
              : t("voiceprints.enrollmentDialogDescription")}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <VoiceprintEnrollmentPanel
            {...panelProps}
            inDialog
            forUserProfile={forUserProfile}
            onEnrolled={handleEnrolled}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
