import type { UserSettings } from "@/lib/types"

export type AppLanguage = "en" | "zh"

export type SummaryStyle = "concise" | "balanced" | "detailed"

export type SummaryFormat = "paragraphs" | "bullets"

export type UserPreferences = UserSettings

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  uiLanguage: "en",
  contentLanguage: "en",
  summaryStyle: "balanced",
  summaryFormat: "paragraphs",
  userName: "",
  userVoiceprintProfileId: null,
  notesAutoSave: true,
}
