import { Link, useParams, useRouterState } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { cn } from "@/lib/utils"
import { parseRecordingDetailTab } from "@/lib/recordingDetailTabs"
import { resolveRecordingKind } from "@/lib/recordings"
import { notesQuery } from "@/lib/queries/notes"
import { recordingQuery } from "@/lib/queries/recordings"

type Crumb = {
  label: string
  to?: string
  params?: { id: string }
  search?: Record<string, unknown>
}

function useRecordingTitle(id: string | undefined) {
  const kind = id ? resolveRecordingKind(id) : null
  const recording = useQuery({
    ...recordingQuery(id ?? ""),
    enabled: kind === "recording" && Boolean(id),
  })

  return recording.data?.title?.trim() || undefined
}

function useRecordingDetailSearch() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const search = useRouterState({ select: (state) => state.location.search })

  if (!pathname.startsWith("/recordings/")) {
    return { tab: "source" as const, noteId: undefined as string | undefined }
  }

  if (typeof search === "object" && search !== null) {
    const typed = search as { tab?: unknown; noteId?: unknown }
    return {
      tab: parseRecordingDetailTab(typed.tab),
      noteId:
        typeof typed.noteId === "string" && typed.noteId.trim()
          ? typed.noteId.trim()
          : undefined,
    }
  }

  return { tab: "source" as const, noteId: undefined as string | undefined }
}

function useNoteSummaryTitle(recordingId: string | undefined, noteId: string | undefined) {
  const notes = useQuery({
    ...notesQuery(recordingId),
    enabled: Boolean(recordingId && noteId),
  })

  if (!noteId) return undefined
  return notes.data?.items.find((note) => note.id === noteId)?.title
}

function buildCrumbs(
  t: TFunction,
  pathname: string,
  id: string | undefined,
  recordTitle: string | undefined,
  tab: ReturnType<typeof parseRecordingDetailTab>,
  noteId: string | undefined,
  noteTitle: string | undefined,
): Crumb[] {
  if (pathname === "/") {
    return [{ label: t("nav.home") }]
  }
  if (pathname === "/recordings") {
    return [{ label: t("nav.recordings") }]
  }
  if (pathname.startsWith("/recordings/") && id) {
    const crumbs: Crumb[] = [
      { label: t("nav.recordings"), to: "/recordings" },
      {
        label: recordTitle || t("nav.untitled"),
        to: "/recordings/$id",
        params: { id },
      },
    ]
    if (tab === "notes") {
      if (noteId) {
        crumbs.push({
          label: t("nav.notes"),
          to: "/recordings/$id",
          params: { id },
          search: { tab: "notes" },
        })
        crumbs.push({
          label: noteTitle?.trim() || t("notes.untitledNote"),
        })
      } else {
        crumbs.push({ label: t("nav.notes") })
      }
    }
    return crumbs
  }
  if (pathname === "/settings") {
    return [{ label: t("nav.settings") }]
  }
  return [{ label: t("nav.appName") }]
}

export function NavBreadcrumb() {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const params = useParams({ strict: false })
  const id = typeof params.id === "string" ? params.id : undefined
  const recordTitle = useRecordingTitle(id)
  const { tab, noteId } = useRecordingDetailSearch()
  const noteTitle = useNoteSummaryTitle(id, noteId)
  const crumbs = buildCrumbs(t, pathname, id, recordTitle, tab, noteId, noteTitle)

  return (
    <nav aria-label={t("nav.breadcrumbAriaLabel")} className="flex min-w-0 items-center gap-1.5 text-sm">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1

        return (
          <span
            key={`${crumb.label}-${index}`}
            className="flex min-w-0 items-center gap-1.5"
          >
            {index > 0 ? (
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            ) : null}
            {crumb.to && !isLast ? (
              <Link
                to={crumb.to}
                params={crumb.params}
                search={crumb.search}
                className="truncate text-muted-foreground transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "truncate",
                  isLast ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {crumb.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
