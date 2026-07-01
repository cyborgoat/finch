
import { useTranslation } from "react-i18next"

type AudioPreviewProps = {
  audioUrl: string | null
}

export function AudioPreview({ audioUrl }: AudioPreviewProps) {
  const { t } = useTranslation()
  if (!audioUrl) return null
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-2 text-sm font-medium">{t("common.preview")}</p>
      <audio controls src={audioUrl} className="w-full" />
    </div>
  )
}
