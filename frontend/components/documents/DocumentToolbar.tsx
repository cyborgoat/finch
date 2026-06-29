"use client"

import { Button } from "@/components/ui/button"

type DocumentToolbarProps = {
  onSave: () => void
  onCopy: () => void
  onExport: () => void
  onDelete: () => void
  isSaving?: boolean
}

export function DocumentToolbar({
  onSave,
  onCopy,
  onExport,
  onDelete,
  isSaving,
}: DocumentToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onSave} disabled={isSaving}>
        {isSaving ? "Saving…" : "Save"}
      </Button>
      <Button variant="outline" onClick={onCopy}>
        Copy
      </Button>
      <Button variant="outline" onClick={onExport}>
        Export MD
      </Button>
      <Button variant="ghost" onClick={onDelete} className="text-destructive">
        Delete
      </Button>
    </div>
  )
}
