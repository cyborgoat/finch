import { NavBreadcrumb } from "@/components/layout/NavBreadcrumb"
import { TopbarActionsMenu } from "@/components/layout/TopbarActionsMenu"
import { TopbarDownloadButton } from "@/components/layout/TopbarDownloadButton"
import { TopbarRecordingIndicator } from "@/components/audio/TopbarRecordingIndicator"
import { useRecordingSession } from "@/components/audio/RecordingSessionProvider"
import { useNewRecordingDialogs } from "@/components/layout/NewRecordingDialogs"

export function Topbar() {
  const session = useRecordingSession()
  const { openRecordDialog } = useNewRecordingDialogs()

  return (
    <header className="relative grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border px-6">
      <div className="min-w-0 justify-self-start">
        <NavBreadcrumb />
      </div>

      <div className="pointer-events-none absolute inset-x-0 flex justify-center px-32">
        <div className="pointer-events-auto max-w-full">
          <TopbarRecordingIndicator
            onExpand={openRecordDialog}
            onSave={() => void session.saveRecording()}
            onDiscard={session.reset}
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-self-end gap-2">
        <TopbarDownloadButton />
        <TopbarActionsMenu />
      </div>
    </header>
  )
}
