import { useEffect, useState } from "react"
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsSection"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import type { UserPreferences } from "@/lib/userPreferences"
import type { SpeakerProfileSummary } from "@/lib/types"

const NO_SPEAKER_VALUE = "__none__"

type UserProfileSettingsProps = {
  preferences: UserPreferences
  profiles: SpeakerProfileSummary[]
  ready: boolean
  disabled?: boolean
  onUpdate: (
    patch: Partial<UserPreferences>,
    successMessage?: string,
  ) => void | Promise<void>
}

export function UserProfileSettings({
  preferences,
  profiles,
  ready,
  disabled,
  onUpdate,
}: UserProfileSettingsProps) {
  const [nameDraft, setNameDraft] = useState(preferences.userName)

  useEffect(() => {
    setNameDraft(preferences.userName)
  }, [preferences.userName])

  useEffect(() => {
    if (!preferences.userSpeakerProfileId) return
    const exists = profiles.some(
      (profile) => profile.id === preferences.userSpeakerProfileId,
    )
    if (!exists) {
      void onUpdate({ userSpeakerProfileId: null })
    }
  }, [onUpdate, preferences.userSpeakerProfileId, profiles])

  const selectedSpeakerValue = preferences.userSpeakerProfileId ?? NO_SPEAKER_VALUE
  const selectedSpeaker = profiles.find(
    (profile) => profile.id === preferences.userSpeakerProfileId,
  )

  const commitName = () => {
    const trimmed = nameDraft.trim()
    if (trimmed === preferences.userName) return
    void onUpdate({ userName: trimmed })
  }

  const controlsDisabled = !ready || disabled

  return (
    <SettingsSection
      title="You"
      description="Your display name and which saved speaker is you."
    >
      <SettingsRow
        label="Your name"
        description="How Finch refers to you in summaries and AI features."
      >
        <Input
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          onBlur={commitName}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur()
            }
          }}
          placeholder="e.g. Alex"
          disabled={controlsDisabled}
          autoComplete="name"
        />
      </SettingsRow>
      <SettingsRow
        label="Your speaker"
        description={
          profiles.length > 0
            ? "Link your voice to a saved speaker profile."
            : "Register a speaker from a recording first."
        }
      >
        <Select
          value={selectedSpeakerValue}
          onValueChange={(value) => {
            void onUpdate({
              userSpeakerProfileId: value === NO_SPEAKER_VALUE ? null : value,
            })
          }}
          disabled={controlsDisabled || profiles.length === 0}
        >
          <SelectTrigger className="w-full">
            <span className="truncate">
              {selectedSpeaker?.displayName ?? "Not linked"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_SPEAKER_VALUE}>Not linked</SelectItem>
            {profiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsRow>
    </SettingsSection>
  )
}
