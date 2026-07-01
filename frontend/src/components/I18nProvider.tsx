import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useUserPreferences } from "@/hooks/useUserPreferences"
import type { AppLanguage } from "@/lib/userPreferences"

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation()
  const { preferences, ready } = useUserPreferences()

  useEffect(() => {
    if (!ready) return
    const next = preferences.uiLanguage as AppLanguage
    if (i18n.language !== next) {
      void i18n.changeLanguage(next)
    }
  }, [i18n, preferences.uiLanguage, ready])

  useEffect(() => {
    document.documentElement.lang = i18n.language === "zh" ? "zh" : "en"
  }, [i18n.language])

  return children
}
