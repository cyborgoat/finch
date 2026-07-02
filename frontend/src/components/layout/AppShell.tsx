import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"
import { Footer } from "@/components/layout/Footer"
import { TopbarActionsProvider } from "@/components/layout/TopbarActionsContext"
import { RecordingSessionProvider } from "@/components/audio/RecordingSessionProvider"
import { NewRecordingDialogsProvider } from "@/components/layout/NewRecordingDialogs"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RecordingSessionProvider>
      <NewRecordingDialogsProvider>
        <TopbarActionsProvider>
          <div className="flex min-h-dvh">
            <Sidebar />
            <div className="flex min-h-dvh flex-1 flex-col">
              <Topbar />
              <main className="flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col px-8 pt-8 pb-40 md:px-10 md:pt-10 md:pb-56">
                {children}
              </main>
              <Footer />
            </div>
          </div>
        </TopbarActionsProvider>
      </NewRecordingDialogsProvider>
    </RecordingSessionProvider>
  )
}
