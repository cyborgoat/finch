"use client"

import { Button } from "@/components/ui/button"

type TranscriptToolbarProps = {
  onSave: () => void
  onCopy: () => void
  onExportTxt: () => void
  onExportMd: () => void
  onDelete: () => void
  isSaving?: boolean
}

export function TranscriptToolbar({
  onSave,
  onCopy,
  onExportTxt,
  onExportMd,
  onDelete,
  isSaving,
}: TranscriptToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onSave} disabled={isSaving}>
        {isSaving ? "Saving…" : "Save"}
      </Button>
      <Button variant="outline" onClick={onCopy}>
        Copy
      </Button>
      <Button variant="outline" onClick={onExportTxt}>
        Export TXT
      </Button>
      <Button variant="outline" onClick={onExportMd}>
        Export MD
      </Button>
      <Button variant="destructive" onClick={onDelete}>
        Delete
      </Button>
    </div>
  )
}
