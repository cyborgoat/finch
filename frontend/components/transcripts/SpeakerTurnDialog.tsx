"use client"

import Link from "next/link"
import { useState } from "react"
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
  const initialName = resolveSpeakerDisplayName(clusterId, {
    segment,
    profiles,
    fallback: segment.matchStatus === "unknown" ? "Unknown Speaker" : segment.speaker,
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
          <DialogTitle>Speaker for this turn</DialogTitle>
          <DialogDescription>
            Assign a name or link to a saved voice profile. Changes apply to all turns
            from this voice in the transcript.
          </DialogDescription>
        </DialogHeader>

        <div className="field-stack py-2">
          {profiles.length > 0 ? (
            <div className="field-stack">
              <Label className="text-xs text-muted-foreground">Saved profile</Label>
              <Select value={profileId} onValueChange={handleProfileChange} disabled={isPending}>
                <SelectTrigger className="w-full">
                  <span className="truncate">
                    {selectedProfile ? selectedProfile.displayName : "New name"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__">New name</SelectItem>
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
              Display name
            </Label>
            <Input
              id="turn-speaker-name"
              value={displayName}
              disabled={isPending || useExisting}
              onChange={(event) => {
                setDisplayName(event.target.value)
                setProfileId("__new__")
              }}
              placeholder="e.g. Robert"
            />
          </div>

          {memoryStatus?.enabled ? (
            memoryReady ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Speaker memory is on. Saving updates the voiceprint from this turn&apos;s
                audio in Settings-managed profiles.
              </p>
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Enable speaker memory and consent in{" "}
                <Link href="/settings" className="text-foreground underline-offset-4 hover:underline">
                  Settings
                </Link>{" "}
                to save voiceprints. You can still assign a display name here.
              </p>
            )
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Turn on speaker memory in{" "}
              <Link href="/settings" className="text-foreground underline-offset-4 hover:underline">
                Settings
              </Link>{" "}
              to remember voices across transcripts.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !displayName.trim()}>
            {isPending ? "Saving…" : "Save speaker"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
