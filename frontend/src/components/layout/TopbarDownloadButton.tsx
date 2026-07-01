import { useState } from "react"
import { AudioLines, FileText, Notebook, Download } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTopbarActions } from "@/components/layout/TopbarActionsContext"
import { downloadAudioAsset } from "@/lib/download"
import { exportDocumentMd, exportTranscriptTxt } from "@/lib/export"

export function TopbarDownloadButton() {
  const { actions } = useTopbarActions()

  if (!actions) return null

  const busy = actions.isRenaming || actions.isDeleting
  const noteMarkdown = actions.activeNoteMarkdown?.trim()
  const hasNote = !!noteMarkdown

  const handleDownloadAudio = () => {
    void downloadAudioAsset(actions.audioAssetId, actions.audioFilename).catch(() => {
      toast.error("Failed to download audio")
    })
  }

  const handleDownloadTranscript = () => {
    exportTranscriptTxt(actions.title, actions.transcriptText)
  }

  const handleDownloadNote = () => {
    if (!noteMarkdown) return
    const label = actions.activeNoteTitle?.trim() || "note"
    exportDocumentMd(`${actions.title} ${label}`, noteMarkdown)
  }

  return (
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
        <DropdownMenuItem onClick={handleDownloadNote} disabled={busy || !hasNote}>
          <Notebook />
          Active note
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
