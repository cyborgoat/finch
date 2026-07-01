import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { resolveSpeakerDisplayName } from "@/lib/speakerMappings"
import type { SpeakerMemoryStatus, SpeakerProfileSummary, SpeakerSegment } from "@/lib/types"

type SpeakerTurnDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  segment: SpeakerSegment
  clusterId: string
  profiles: SpeakerProfileSummary[]
  memoryStatus?: SpeakerMemoryStatus
  isPending?: boolean
  onSave: (payload: {
    displayName: string
    profileId?: string
  }) => void
}

export function SpeakerTurnDialog({
  open,
  onOpenChange,
  segment,
  clusterId,
  profiles,
  memoryStatus,
  isPending,
  onSave,
}: SpeakerTurnDialogProps) {
  const { t } = useTranslation()
  const initialName = resolveSpeakerDisplayName(clusterId, {
    segment,
    profiles,
    fallback:
      segment.matchStatus === "unknown"
        ? t("transcript.unknownSpeaker")
        : segment.speaker,
  })
  const initialProfileId = segment.speakerProfileId ?? ""

  const [profileId, setProfileId] = useState(initialProfileId || "__new__")
  const [displayName, setDisplayName] = useState(initialName)

  const selectedProfile = profiles.find((item) => item.id === profileId)
  const useExisting = profileId !== "__new__" && Boolean(selectedProfile)

  const handleProfileChange = (value: string | null) => {
    if (!value || value === "__new__") {
      setProfileId("__new__")
      return
    }
    setProfileId(value)
    const profile = profiles.find((item) => item.id === value)
    if (profile) {
      setDisplayName(profile.displayName)
    }
  }

  const handleSubmit = () => {
    const name = (useExisting ? selectedProfile?.displayName : displayName)?.trim()
    if (!name) return
    onSave({
      displayName: name,
      profileId: useExisting ? profileId : undefined,
    })
  }

  const memoryReady = memoryStatus?.enabled && memoryStatus?.consentGiven

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("transcript.speakerTurnTitle")}</DialogTitle>
          <DialogDescription>{t("transcript.speakerTurnDescription")}</DialogDescription>
        </DialogHeader>

        <div className="field-stack py-2">
          {profiles.length > 0 ? (
            <div className="field-stack">
              <Label className="text-xs text-muted-foreground">
                {t("transcript.savedProfile")}
              </Label>
              <Select value={profileId} onValueChange={handleProfileChange} disabled={isPending}>
                <SelectTrigger className="w-full">
                  <span className="truncate">
                    {selectedProfile
                      ? selectedProfile.displayName
                      : t("transcript.newName")}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__">{t("transcript.newName")}</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="field-stack">
            <Label htmlFor="turn-speaker-name" className="text-xs text-muted-foreground">
              {t("common.displayName")}
            </Label>
            <Input
              id="turn-speaker-name"
              value={displayName}
              disabled={isPending || useExisting}
              onChange={(event) => {
                setDisplayName(event.target.value)
                setProfileId("__new__")
              }}
              placeholder={t("transcript.namePlaceholder")}
            />
          </div>

          {memoryReady ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("transcript.memoryReadyHint")}
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("transcript.memoryDisabledHint")}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !displayName.trim()}>
            {isPending ? t("common.saving") : t("transcript.saveSpeaker")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
