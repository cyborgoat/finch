import { Copy, Download } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import { StickyActionBar } from "@/components/layout/StickyActionBar"

type NoteToolbarProps = {
  onSave?: () => void
  onCopy: () => void
  onExport: () => void
  onDelete: () => void
  isSaving?: boolean
  isDeleting?: boolean
}

export function NoteToolbar({
  onSave,
  onCopy,
  onExport,
  onDelete,
  isSaving,
  isDeleting,
}: NoteToolbarProps) {
  const { t } = useTranslation()

  return (
    <StickyActionBar>
      <div className="flex flex-wrap items-center gap-2">
        {onSave ? (
          <Button onClick={onSave} disabled={isSaving} size="sm">
            {isSaving ? t("common.saving") : t("common.save")}
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={onCopy}>
          <Copy className="size-4" />
          {t("common.copy")}
        </Button>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="size-4" />
          {t("recordings.exportMd")}
        </Button>
      </div>
      <DeleteConfirmDialog
        title={t("notes.deleteTitle")}
        description={t("notes.deleteDescription")}
        onConfirm={onDelete}
        isPending={isDeleting}
        variant="ghost"
      />
    </StickyActionBar>
  )
}
