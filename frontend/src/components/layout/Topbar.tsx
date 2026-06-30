import { NavBreadcrumb } from "@/components/layout/NavBreadcrumb"
import { TopbarActionsMenu } from "@/components/layout/TopbarActionsMenu"
import { TopbarDownloadButton } from "@/components/layout/TopbarDownloadButton"

export function Topbar() {
  return (
    <header className="flex h-14 items-center gap-4 border-b border-border px-6">
      <NavBreadcrumb />
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <TopbarDownloadButton />
        <TopbarActionsMenu />
      </div>
    </header>
  )
}
