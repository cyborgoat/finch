import { useState } from "react"
import { AudioLines, FileText, Sparkles, Download } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTopbarActions } from "@/components/layout/TopbarActionsContext"
import { downloadAudioAsset } from "@/lib/download"
import { exportTranscriptTxt } from "@/lib/export"

export function TopbarDownloadButton() {
  const { actions } = useTopbarActions()
  const [summaryComingSoonOpen, setSummaryComingSoonOpen] = useState(false)

  if (!actions) return null

  const busy = actions.isRenaming || actions.isDeleting

  const handleDownloadAudio = () => {
    void downloadAudioAsset(actions.audioAssetId, actions.audioFilename).catch(() => {
      toast.error("Failed to download audio")
    })
  }

  const handleDownloadTranscript = () => {
    exportTranscriptTxt(actions.title, actions.transcriptText)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Download"
              disabled={busy}
            >
              <Download className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent
          align="end"
          className="w-auto min-w-48 p-1.5 [&_[data-slot=dropdown-menu-item]]:gap-2.5 [&_[data-slot=dropdown-menu-item]]:px-3 [&_[data-slot=dropdown-menu-item]]:py-2"
        >
          <DropdownMenuItem onClick={handleDownloadAudio} disabled={busy}>
            <AudioLines />
            Audio
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadTranscript} disabled={busy}>
            <FileText />
            Transcript
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setSummaryComingSoonOpen(true)}
            disabled={busy}
          >
            <Sparkles />
            Summary
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={summaryComingSoonOpen} onOpenChange={setSummaryComingSoonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Summary download coming soon</DialogTitle>
            <DialogDescription>
              AI-generated summaries are still in development. Once available,
              you&apos;ll be able to download them from here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setSummaryComingSoonOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
