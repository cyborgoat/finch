import { useTranslation } from "react-i18next"
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsSection"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import type { UserPreferences } from "@/lib/userPreferences"

type SettingsAiNotesSectionProps = {
  preferences: UserPreferences
  disabled?: boolean
  onSave: (patch: Partial<UserPreferences>) => void | Promise<void>
}

export function SettingsAiNotesSection({
  preferences,
  disabled,
  onSave,
}: SettingsAiNotesSectionProps) {
  const { t } = useTranslation()

  return (
    <SettingsSection
      title={t("settings.aiNotesTitle")}
      description={t("settings.aiNotesDescription")}
    >
      <SettingsRow
        label={t("settings.summaryStyleLabel")}
        description={t("settings.summaryStyleDescription")}
      >
        <Select
          value={preferences.summaryStyle}
          onValueChange={(value) => {
            if (value !== "concise" && value !== "balanced" && value !== "detailed") return
            void onSave({ summaryStyle: value })
          }}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <span>
              {preferences.summaryStyle === "concise"
                ? t("settings.summaryStyleConcise")
                : preferences.summaryStyle === "detailed"
                  ? t("settings.summaryStyleDetailed")
                  : t("settings.summaryStyleBalanced")}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="concise">{t("settings.summaryStyleConcise")}</SelectItem>
            <SelectItem value="balanced">{t("settings.summaryStyleBalanced")}</SelectItem>
            <SelectItem value="detailed">{t("settings.summaryStyleDetailed")}</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>
      <SettingsRow
        label={t("settings.summaryFormatLabel")}
        description={t("settings.summaryFormatDescription")}
      >
        <Select
          value={preferences.summaryFormat}
          onValueChange={(value) => {
            if (value !== "paragraphs" && value !== "bullets") return
            void onSave({ summaryFormat: value })
          }}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <span>
              {preferences.summaryFormat === "bullets"
                ? t("settings.summaryFormatBullets")
                : t("settings.summaryFormatParagraphs")}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paragraphs">{t("settings.summaryFormatParagraphs")}</SelectItem>
            <SelectItem value="bullets">{t("settings.summaryFormatBullets")}</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>
      <SettingsRow
        label={t("settings.notesAutoSaveLabel")}
        description={t("settings.notesAutoSaveDescription")}
      >
        <div className="flex justify-end">
          <Switch
            checked={preferences.notesAutoSave}
            onCheckedChange={(checked) => {
              void onSave({ notesAutoSave: checked })
            }}
            disabled={disabled}
          />
        </div>
      </SettingsRow>
    </SettingsSection>
  )
}
