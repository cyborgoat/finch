import { useTranslation } from "react-i18next"
import type { AppLanguage } from "@/lib/userPreferences"

const INTL_LOCALES: Record<AppLanguage, string> = {
  en: "en-US",
  zh: "zh-CN",
}

export function useLocale() {
  const { i18n } = useTranslation()
  const language = (i18n.language === "zh" ? "zh" : "en") as AppLanguage
  const intlLocale = INTL_LOCALES[language]

  return {
    language,
    intlLocale,
    formatDateTime: (value: string | Date, options?: Intl.DateTimeFormatOptions) =>
      new Date(value).toLocaleString(intlLocale, options),
    formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) =>
      new Date(value).toLocaleDateString(intlLocale, options),
  }
}
