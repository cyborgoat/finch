
import { useTranslation } from "react-i18next"

type AudioPreviewProps = {
  audioUrl: string | null
  embedded?: boolean
}

export function AudioPreview({ audioUrl, embedded = false }: AudioPreviewProps) {
  const { t } = useTranslation()
  if (!audioUrl) return null
  return (
    <div className={embedded ? "space-y-2" : "rounded-lg border border-border bg-card p-4"}>
      <p className="text-sm font-medium">{t("common.preview")}</p>
      <div className={embedded ? "surface-inset p-3" : undefined}>
        <audio controls src={audioUrl} className="w-full" />
      </div>
    </div>
  )
}
