import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type NoteSelectItem = {
  value: string
  label: string
}

type NoteSelectToolbarProps = {
  activeNoteId: string | null
  noteItems: NoteSelectItem[]
  actionsDisabled?: boolean
  onNoteSelect: (noteId: string | null) => void
  onRename: () => void
  onDelete: () => void
  onCreate: () => void
}

export function NoteSelectToolbar({
  activeNoteId,
  noteItems,
  actionsDisabled,
  onNoteSelect,
  onRename,
  onDelete,
  onCreate,
}: NoteSelectToolbarProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <Select
          value={activeNoteId ?? undefined}
          onValueChange={onNoteSelect}
          items={noteItems}
        >
          <SelectTrigger className="h-8 w-full text-sm">
            <SelectValue placeholder={t("notes.selectNote")} />
          </SelectTrigger>
          <SelectContent
            align="start"
            alignItemWithTrigger={false}
            className="max-h-80 min-w-64"
          >
            {noteItems.map((item) => (
              <SelectItem key={item.value} value={item.value} label={item.label}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="shrink-0"
              aria-label={t("notes.actionsAriaLabel")}
              disabled={!activeNoteId || actionsDisabled}
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onRename} disabled={actionsDisabled}>
            <Pencil />
            {t("notes.renameNote")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={onDelete}
            disabled={actionsDisabled}
          >
            <Trash2 />
            {t("notes.deleteNote")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="shrink-0"
        aria-label={t("notes.newNoteAriaLabel")}
        onClick={onCreate}
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  )
}
