import { useTranslation } from "react-i18next"
import { AudioDialogFooter } from "@/components/audio/AudioDialogControls"
import { Button } from "@/components/ui/button"

type EnrollmentHowItWorksStepProps = {
  onDiscard: () => void
  onNext: () => void
}

export function EnrollmentHowItWorksStep({ onDiscard, onNext }: EnrollmentHowItWorksStepProps) {
  const { t } = useTranslation()

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            {t("voiceprints.enrollmentHowItWorksTitle")}
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>{t("voiceprints.enrollmentHowItWorks1")}</li>
            <li>{t("voiceprints.enrollmentHowItWorks2")}</li>
            <li>{t("voiceprints.enrollmentHowItWorks3")}</li>
            <li>{t("voiceprints.enrollmentHowItWorks4")}</li>
          </ul>
        </div>
      </div>
      <AudioDialogFooter className="justify-end">
        <Button type="button" variant="outline" onClick={onDiscard}>
          {t("voiceprints.enrollmentExit")}
        </Button>
        <Button type="button" onClick={onNext}>
          {t("voiceprints.enrollmentNext")}
        </Button>
      </AudioDialogFooter>
    </>
  )
}
