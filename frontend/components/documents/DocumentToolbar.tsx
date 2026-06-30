"use client"

import { Copy, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import { StickyActionBar } from "@/components/layout/StickyActionBar"

type DocumentToolbarProps = {
  onSave: () => void
  onCopy: () => void
  onExport: () => void
  onDelete: () => void
  isSaving?: boolean
  isDeleting?: boolean
}

export function DocumentToolbar({
  onSave,
  onCopy,
  onExport,
  onDelete,
  isSaving,
  isDeleting,
}: DocumentToolbarProps) {
  return (
    <StickyActionBar>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onSave} disabled={isSaving} size="sm">
          {isSaving ? "Saving…" : "Save"}
        </Button>
        <Button variant="outline" size="sm" onClick={onCopy}>
          <Copy className="size-4" />
          Copy
        </Button>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="size-4" />
          Export MD
        </Button>
      </div>
      <DeleteConfirmDialog
        title="Delete document?"
        description="This permanently removes the document and cannot be undone."
        onConfirm={onDelete}
        isPending={isDeleting}
        variant="ghost"
      />
    </StickyActionBar>
  )
}
