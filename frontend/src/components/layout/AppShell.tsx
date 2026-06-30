import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"
import { TopbarActionsProvider } from "@/components/layout/TopbarActionsContext"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TopbarActionsProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-8 py-8 md:px-10 md:py-10">{children}</main>
        </div>
      </div>
    </TopbarActionsProvider>
  )
}
