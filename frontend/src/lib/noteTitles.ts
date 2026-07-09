import type { TFunction } from "i18next"

export const TEMPLATE_NOTE_TYPES = [
  "meeting_summary",
  "action_items",
  "key_decisions",
  "follow_up_email",
] as const

type TemplateNoteType = (typeof TEMPLATE_NOTE_TYPES)[number]

/** Legacy stored titles before titleIsAuto — kept for display only. */
const LEGACY_TEMPLATE_PREFIXES: Record<TemplateNoteType, readonly string[]> = {
  meeting_summary: ["Meeting Summary", "会议摘要"],
  action_items: ["Action Items", "行动项"],
  key_decisions: ["Key Decisions", "关键决策"],
  follow_up_email: ["Follow-up Email", "跟进邮件"],
}

const LEGACY_MANUAL_PREFIXES = ["Note", "笔记"] as const

type NoteTitleSource = {
  type: string
  title: string
  titleIsAuto?: boolean
  createdAt: string
  status?: string
}

function isTemplateType(type: string): type is TemplateNoteType {
  return (TEMPLATE_NOTE_TYPES as readonly string[]).includes(type)
}

function splitDatedTitle(title: string): { prefix: string; datePart: string } | null {
  const parts = title.split(" · ")
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  return { prefix: parts[0], datePart: parts[1] }
}

function isLegacyAutoTemplateTitle(type: string, title: string): boolean {
  if (!isTemplateType(type)) return false
  const split = splitDatedTitle(title)
  if (!split) return false
  return LEGACY_TEMPLATE_PREFIXES[type].includes(split.prefix)
}

function isLegacyAutoManualTitle(title: string): boolean {
  const split = splitDatedTitle(title)
  if (!split) return false
  return (LEGACY_MANUAL_PREFIXES as readonly string[]).includes(split.prefix)
}

function shouldDeriveTitle(note: Pick<NoteTitleSource, "type" | "title" | "titleIsAuto">): boolean {
  if (note.titleIsAuto) return true
  if (isLegacyAutoTemplateTitle(note.type, note.title)) return true
  if (note.type === "note" && isLegacyAutoManualTitle(note.title)) return true
  return false
}

function templateTitleKey(type: string): string {
  return isTemplateType(type) ? `templates.${type}.title` : "common.note"
}

export function formatNoteTitleDate(iso: string, locale: string): string {
  const date = new Date(iso)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  if (locale.startsWith("zh")) {
    return `${year}年${month.toString().padStart(2, "0")}月${day.toString().padStart(2, "0")}日`
  }
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ]
  return `${monthNames[month - 1]} ${day.toString().padStart(2, "0")}, ${year}`
}

export function resolveNoteTitle(
  note: Pick<NoteTitleSource, "type" | "title" | "titleIsAuto" | "createdAt">,
  t: TFunction,
  locale: string,
): string {
  if (!shouldDeriveTitle(note)) {
    return note.title
  }

  const prefix =
    note.type === "note"
      ? t("notes.defaultManualTitle")
      : t(templateTitleKey(note.type), { defaultValue: note.type })

  return `${prefix} · ${formatNoteTitleDate(note.createdAt, locale)}`
}

export function resolveNoteDisplayTitle(
  note: NoteTitleSource,
  t: TFunction,
  locale: string,
): string {
  const displayTitle = resolveNoteTitle(note, t, locale)
  if (note.status === "generating") {
    return t("notes.generatingLabel", { title: displayTitle })
  }
  if (note.status === "failed") {
    return t("notes.failedLabel", { title: displayTitle })
  }
  return displayTitle
}

export function noteTitleWasCustomized(
  note: Pick<NoteTitleSource, "type" | "title" | "titleIsAuto" | "createdAt">,
  editedTitle: string,
  t: TFunction,
  locale: string,
): boolean {
  if (!note.titleIsAuto) return true
  const autoTitle = resolveNoteTitle(note, t, locale)
  return editedTitle.trim() !== autoTitle.trim()
}
