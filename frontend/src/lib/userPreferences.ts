export type AppLanguage = "en" | "zh"

export type SummaryStyle = "concise" | "balanced" | "detailed"

export type SummaryFormat = "paragraphs" | "bullets"

export type UserPreferences = {
  language: AppLanguage
  summaryStyle: SummaryStyle
  summaryFormat: SummaryFormat
  userName: string
  userSpeakerProfileId: string | null
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  language: "en",
  summaryStyle: "balanced",
  summaryFormat: "paragraphs",
  userName: "",
  userSpeakerProfileId: null,
}
