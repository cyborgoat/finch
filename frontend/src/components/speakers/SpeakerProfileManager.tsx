import { MoreHorizontal } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { EmptyState } from "@/components/effects/EmptyState"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SpeakerProfileSummary } from "@/lib/types"

type SpeakerProfileManagerProps = {
  profiles: SpeakerProfileSummary[]
  onRename: (profileId: string, displayName: string) => void | Promise<void>
  onDelete: (profileId: string, displayName: string) => void
  isRenaming?: boolean
  isDeleting?: boolean
  embedded?: boolean
  userSpeakerProfileId?: string | null
}

function SpeakerRow({
  profile,
  onRename,
  onDelete,
  isRenaming,
  isDeleting,
  embedded,
  isYou,
}: {
  profile: SpeakerProfileSummary
  onRename: (profileId: string, displayName: string) => void | Promise<void>
  onDelete: (profileId: string, displayName: string) => void
  isRenaming?: boolean
  isDeleting?: boolean
  embedded?: boolean
  isYou?: boolean
}) {
  const { t } = useTranslation()
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [displayName, setDisplayName] = useState(profile.displayName)
  const busy = isRenaming || isDeleting

  const openRename = () => {
    setDisplayName(profile.displayName)
    setRenameOpen(true)
  }

  const handleRename = async () => {
    const trimmed = displayName.trim()
    if (!trimmed) return
    if (trimmed === profile.displayName) {
      setRenameOpen(false)
      return
    }
    await onRename(profile.id, trimmed)
    setRenameOpen(false)
  }

  return (
    <>
      <div className={embedded ? "flex items-center justify-between gap-3 py-2" : "flex items-center justify-between gap-3 px-4 py-3"}>
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate text-sm font-medium text-foreground">
            {profile.displayName}
          </p>
          {isYou ? (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {t("common.you")}
            </Badge>
          ) : null}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("speakers.actionsAriaLabel", { name: profile.displayName })}
                disabled={busy}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={openRename}>{t("common.rename")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              {t("speakers.deleteVoiceProfile")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("speakers.renameTitle")}</DialogTitle>
            <DialogDescription>
              {t("speakers.renameDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="field-stack py-2">
            <Label htmlFor={`rename-${profile.id}`}>{t("common.displayName")}</Label>
            <Input
              id={`rename-${profile.id}`}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleRename()
              }}
              disabled={isRenaming}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={isRenaming}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => void handleRename()}
              disabled={isRenaming || !displayName.trim()}
            >
              {isRenaming ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("speakers.deleteTitle", { name: profile.displayName })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("speakers.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                onDelete(profile.id, profile.displayName)
                setDeleteOpen(false)
              }}
            >
              {isDeleting ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function SpeakerProfileManager({
  profiles,
  onRename,
  onDelete,
  isRenaming,
  isDeleting,
  embedded,
  userSpeakerProfileId,
}: SpeakerProfileManagerProps) {
  const { t } = useTranslation()

  if (profiles.length === 0) {
    return (
      <EmptyState
        title={t("speakers.emptyTitle")}
        description={t("speakers.emptyDescription")}
        className="py-8"
      />
    )
  }

  return (
    <div
      className={
        embedded
          ? "divide-y divide-border"
          : "divide-y divide-border rounded-lg border border-border"
      }
    >
      {profiles.map((profile) => (
        <SpeakerRow
          key={profile.id}
          profile={profile}
          onRename={onRename}
          onDelete={onDelete}
          isRenaming={isRenaming}
          isDeleting={isDeleting}
          embedded={embedded}
          isYou={profile.id === userSpeakerProfileId}
        />
      ))}
    </div>
  )
}
