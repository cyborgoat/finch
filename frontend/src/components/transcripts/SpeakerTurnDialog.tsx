import { useEffect, useState } from "react"
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
import { VoiceprintConsentDialog } from "@/components/voiceprints/VoiceprintConsentDialog"
import { useRecordVoiceprintConsent } from "@/hooks/useVoiceprintProfiles"
import { resolveSpeakerDisplayName } from "@/lib/voiceprintLabels"
import { updateTranscriptionSettings } from "@/lib/api"
import type { VoiceprintProfilesStatus, VoiceprintProfileSummary, SpeakerSegment } from "@/lib/types"

type SpeakerSavePayload = {
  displayName: string
  profileId: string | null
  enroll: boolean
}

type SpeakerTurnDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  segment: SpeakerSegment
  clusterId: string
  profiles: VoiceprintProfileSummary[]
  memoryStatus?: VoiceprintProfilesStatus
  isPending?: boolean
  onSave: (payload: SpeakerSavePayload) => Promise<void>
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
  const consentMutation = useRecordVoiceprintConsent()
  const initialName = resolveSpeakerDisplayName(clusterId, {
    segment,
    profiles,
    fallback:
      segment.matchStatus === "unknown"
        ? t("recording.unknownSpeaker")
        : segment.speaker,
  })
  const initialProfileId = segment.voiceprintProfileId ?? ""

  const [profileId, setProfileId] = useState(initialProfileId || "__new__")
  const [displayName, setDisplayName] = useState(initialName)
  const [consentOpen, setConsentOpen] = useState(false)
  const [pendingSave, setPendingSave] = useState<SpeakerSavePayload | null>(null)

  useEffect(() => {
    if (!open) return
    const name = resolveSpeakerDisplayName(clusterId, {
      segment,
      profiles,
      fallback:
        segment.matchStatus === "unknown"
          ? t("recording.unknownSpeaker")
          : segment.speaker,
    })
    setProfileId(segment.voiceprintProfileId || "__new__")
    setDisplayName(name)
  }, [open, clusterId, segment, profiles, t])

  const selectedProfile = profiles.find((item) => item.id === profileId)
  const useExisting = profileId !== "__new__" && Boolean(selectedProfile)
  const memoryReady = memoryStatus?.ready ?? false
  const hasConsent = memoryStatus?.consentGiven ?? false
  const canEnroll = memoryReady && hasConsent
  const consentBusy = consentMutation.isPending || isPending

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

  const buildPayload = (): SpeakerSavePayload | null => {
    const name = (useExisting ? selectedProfile?.displayName : displayName)?.trim()
    if (!name) return null
    return {
      displayName: name,
      profileId: useExisting ? profileId : null,
      enroll: canEnroll,
    }
  }

  const performSave = async (payload: SpeakerSavePayload) => {
    await onSave(payload)
    onOpenChange(false)
  }

  const handleSubmit = () => {
    const payload = buildPayload()
    if (!payload) return

    if (memoryReady && !hasConsent) {
      setPendingSave({ ...payload, enroll: true })
      setConsentOpen(true)
      return
    }

    void performSave(payload)
  }

  const handleConsent = async () => {
    if (!pendingSave) return
    try {
      await consentMutation.mutateAsync()
      await updateTranscriptionSettings({ speakerMemoryEnabled: true })
      await performSave(pendingSave)
      setPendingSave(null)
      setConsentOpen(false)
    } catch {
      // Parent / mutation handles errors
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("recording.speakerTurnTitle")}</DialogTitle>
            <DialogDescription>{t("recording.speakerTurnDescription")}</DialogDescription>
          </DialogHeader>

          <div className="field-stack py-2">
            <div className="field-stack">
              <Label className="text-xs text-muted-foreground">
                {t("recording.savedProfile")}
              </Label>
              <Select value={profileId} onValueChange={handleProfileChange} disabled={isPending}>
                <SelectTrigger className="w-full">
                  <span className="truncate">
                    {selectedProfile
                      ? selectedProfile.displayName
                      : t("recording.newName")}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__">{t("recording.newName")}</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                placeholder={t("recording.namePlaceholder")}
              />
            </div>

            {canEnroll ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("recording.memoryReadyHint")}
              </p>
            ) : memoryReady ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("recording.memoryConsentHint")}
              </p>
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("recording.memoryDisabledHint")}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !displayName.trim()}>
              {isPending ? t("common.saving") : t("recording.saveSpeaker")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VoiceprintConsentDialog
        open={consentOpen}
        onOpenChange={(nextOpen) => {
          setConsentOpen(nextOpen)
          if (!nextOpen) {
            setPendingSave(null)
          }
        }}
        onConfirm={() => void handleConsent()}
        isPending={consentBusy}
      />
    </>
  )
}
