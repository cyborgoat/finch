
import { Copy, Download, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StickyActionBar } from "@/components/layout/StickyActionBar"

type TranscriptToolbarProps = {
  onSave: () => void
  onCopy: () => void
  onExportTxt: () => void
  onExportMd: () => void
  onDelete: () => void
  isSaving?: boolean
  isDeleting?: boolean
}

export function TranscriptToolbar({
  onSave,
  onCopy,
  onExportTxt,
  onExportMd,
  onDelete,
  isSaving,
  isDeleting,
}: TranscriptToolbarProps) {
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
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                <Download className="size-4" />
                Export
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={onExportTxt}>Export as TXT</DropdownMenuItem>
            <DropdownMenuItem onClick={onExportMd}>Export as Markdown</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-2">
        <DeleteConfirmDialog
          title="Delete transcript?"
          description="This permanently removes the transcript and cannot be undone."
          onConfirm={onDelete}
          triggerLabel="Delete"
          isPending={isDeleting}
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" className="lg:hidden">
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onCopy}>Copy</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExportTxt}>Export TXT</DropdownMenuItem>
            <DropdownMenuItem onClick={onExportMd}>Export MD</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </StickyActionBar>
  )
}
