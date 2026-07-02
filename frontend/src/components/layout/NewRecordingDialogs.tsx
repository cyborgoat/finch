import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { RecordAudioDialog } from "@/components/audio/RecordAudioDialog"
import { useRecordingSession } from "@/components/audio/RecordingSessionProvider"
import { UploadAudioDialog } from "@/components/audio/UploadAudioDialog"

type NewRecordingDialogsContextValue = {
  openUploadDialog: () => void
  openRecordDialog: () => void
}

const NewRecordingDialogsContext =
  createContext<NewRecordingDialogsContextValue | null>(null)

export function NewRecordingDialogsProvider({ children }: { children: ReactNode }) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const session = useRecordingSession()

  const openUploadDialog = useCallback(() => setUploadOpen(true), [])
  const openRecordDialog = useCallback(() => session.openRecordDialog(), [session])

  const value = useMemo(
    () => ({ openUploadDialog, openRecordDialog }),
    [openRecordDialog, openUploadDialog],
  )

  return (
    <NewRecordingDialogsContext.Provider value={value}>
      {children}
      <UploadAudioDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <RecordAudioDialog
        open={session.recordDialogOpen}
        onOpenChange={(open) => {
          if (open) session.openRecordDialog()
          else session.closeRecordDialog()
        }}
      />
    </NewRecordingDialogsContext.Provider>
  )
}

export function useNewRecordingDialogs() {
  const context = useContext(NewRecordingDialogsContext)
  if (!context) {
    throw new Error("useNewRecordingDialogs must be used within NewRecordingDialogsProvider")
  }
  return context
}
