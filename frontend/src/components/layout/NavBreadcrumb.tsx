import { Link, useParams, useRouterState } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { cn } from "@/lib/utils"
import { parseFileDetailTab } from "@/lib/fileDetailTabs"
import { resolveFileKind } from "@/lib/files"
import { documentQuery } from "@/lib/queries/documents"
import { transcriptQuery } from "@/lib/queries/transcripts"

type Crumb = {
  label: string
  to?: string
  params?: { id: string }
}

function useFileRecordTitle(id: string | undefined) {
  const kind = id ? resolveFileKind(id) : null
  const transcript = useQuery({
    ...transcriptQuery(id ?? ""),
    enabled: kind === "transcript" && Boolean(id),
  })
  const document = useQuery({
    ...documentQuery(id ?? ""),
    enabled: kind === "document" && Boolean(id),
  })

  if (kind === "transcript") {
    return transcript.data?.title?.trim() || undefined
  }
  if (kind === "document") {
    return document.data?.title?.trim() || undefined
  }
  return undefined
}

function useFileDetailTab() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const search = useRouterState({ select: (state) => state.location.search })

  if (!pathname.startsWith("/files/")) {
    return "source" as const
  }

  if (typeof search === "object" && search !== null && "tab" in search) {
    return parseFileDetailTab((search as { tab?: unknown }).tab)
  }

  return "source" as const
}

function buildCrumbs(
  t: TFunction,
  pathname: string,
  id: string | undefined,
  recordTitle: string | undefined,
  tab: ReturnType<typeof useFileDetailTab>,
): Crumb[] {
  if (pathname === "/") {
    return [{ label: t("nav.home") }]
  }
  if (pathname === "/files") {
    return [{ label: t("nav.files") }]
  }
  if (pathname.startsWith("/files/") && id) {
    const crumbs: Crumb[] = [
      { label: t("nav.files"), to: "/files" },
      {
        label: recordTitle || t("nav.untitled"),
        to: "/files/$id",
        params: { id },
      },
    ]
    if (tab === "notes") {
      crumbs.push({ label: t("nav.notes") })
    }
    return crumbs
  }
  if (pathname === "/settings") {
    return [{ label: t("nav.settings") }]
  }
  if (pathname === "/record") {
    return [{ label: t("nav.recordVoice") }]
  }
  if (pathname === "/upload") {
    return [{ label: t("nav.uploadAudio") }]
  }
  return [{ label: t("nav.appName") }]
}

export function NavBreadcrumb() {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const params = useParams({ strict: false })
  const id = typeof params.id === "string" ? params.id : undefined
  const recordTitle = useFileRecordTitle(id)
  const tab = useFileDetailTab()
  const crumbs = buildCrumbs(t, pathname, id, recordTitle, tab)

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
