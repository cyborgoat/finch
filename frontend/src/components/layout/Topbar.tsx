import { NavBreadcrumb } from "@/components/layout/NavBreadcrumb"
import { TopbarActionsMenu } from "@/components/layout/TopbarActionsMenu"
import { TopbarDownloadButton } from "@/components/layout/TopbarDownloadButton"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function Topbar() {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-border px-6">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger />
        <NavBreadcrumb />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <TopbarDownloadButton />
        <TopbarActionsMenu />
      </div>
    </header>
  )
}
