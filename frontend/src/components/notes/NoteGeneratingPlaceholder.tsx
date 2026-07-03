import { CompactJobProgress } from "@/components/jobs/CompactJobProgress"
import { useTranslation } from "react-i18next"
import type { Job } from "@/lib/types"

type NoteGeneratingPlaceholderProps = {
  templateTitle: string
  job: Job | null
  error?: string | null
}

export function NoteGeneratingPlaceholder({
  templateTitle,
  job,
  error,
}: NoteGeneratingPlaceholderProps) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-[320px] flex-col justify-center gap-4 p-6 sm:p-8">
      <p className="text-center text-sm text-muted-foreground">
        {t("notes.generatingTitle", { title: templateTitle })}
      </p>
      <CompactJobProgress job={job} error={error} jobType="ai_action" />
      <p className="text-center text-xs text-muted-foreground">{t("notes.generatingHint")}</p>
    </div>
  )
}
