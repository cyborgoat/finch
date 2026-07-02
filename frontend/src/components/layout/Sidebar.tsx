import { Link, useRouterState } from "@tanstack/react-router"
import { ChevronDown, Mic, Upload } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNewRecordingDialogs } from "@/components/layout/NewRecordingDialogs"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const { t } = useTranslation()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const { openUploadDialog, openRecordDialog } = useNewRecordingDialogs()

  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/recordings", label: t("nav.recordings") },
    { href: "/settings", label: t("nav.settings") },
  ] as const

  return (
    <aside className="flex min-h-dvh w-56 shrink-0 flex-col border-r border-border bg-card/50 p-4">
      <Link
        to="/"
        className="mb-8 flex items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-muted/60"
      >
        <img
          src="/logo.png"
          alt=""
          width={36}
          height={36}
          className="size-9 shrink-0 rounded-lg object-contain"
        />
        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-tight">{t("nav.appName")}</p>
          <p className="truncate text-xs text-muted-foreground">{t("nav.tagline")}</p>
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button className="mb-4 w-full justify-between" size="sm">
              {t("nav.new")}
              <ChevronDown className="size-4 opacity-70" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-(--anchor-width)">
          <DropdownMenuItem onClick={openRecordDialog}>
            <Mic className="size-4" />
            {t("nav.recordVoice")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openUploadDialog}>
            <Upload className="size-4" />
            {t("nav.uploadAudio")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
              pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href))
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
