import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsSection"
import { UserProfileSettings } from "@/components/settings/UserProfileSettings"
import { LlmSettingsPanel } from "@/components/settings/LlmSettingsPanel"
import { SpeakerConsentDialog } from "@/components/speakers/SpeakerConsentDialog"
import { SpeakerProfileManager } from "@/components/speakers/SpeakerProfileManager"
import { PageContainer } from "@/components/layout/PageContainer"
import { BlurFade } from "@/components/motion-primitives/blur-fade"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  useDeleteSpeakerProfile,
  useRecordSpeakerConsent,
  useSpeakerMemoryStatus,
  useSpeakerProfiles,
  useToggleSpeakerMemory,
  useUpdateSpeakerProfile,
} from "@/hooks/useSpeakerProfiles"
import { useUserPreferences } from "@/hooks/useUserPreferences"
import type { UserPreferences } from "@/lib/userPreferences"
import {
  speakerMemoryStatusQuery,
  speakerProfilesQuery,
} from "@/lib/queries/speakers"
import { llmSettingsQuery } from "@/lib/queries/llmSettings"
import { userSettingsQuery } from "@/lib/queries/userSettings"

export const Route = createFileRoute("/settings/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(speakerProfilesQuery()),
      context.queryClient.ensureQueryData(speakerMemoryStatusQuery()),
      context.queryClient.ensureQueryData(userSettingsQuery()),
      context.queryClient.ensureQueryData(llmSettingsQuery()),
    ]),
  component: SettingsPage,
})

function SettingsPage() {
  const { data: profilesData } = useSpeakerProfiles()
  const { data: memoryStatus } = useSpeakerMemoryStatus()
  const deleteProfile = useDeleteSpeakerProfile()
  const updateProfile = useUpdateSpeakerProfile()
  const toggleMemory = useToggleSpeakerMemory()
  const consentMutation = useRecordSpeakerConsent()
  const { preferences, updatePreferences, ready, isUpdating } = useUserPreferences()
  const [consentOpen, setConsentOpen] = useState(false)

  const autoLabelEnabled = memoryStatus?.enabled ?? false
  const autoLabelReady = memoryStatus?.ready ?? false
  const togglePending = toggleMemory.isPending || consentMutation.isPending
  const settingsBusy = !ready || isUpdating

  const profiles = profilesData?.items ?? []

  const savePreference = async (
    patch: Partial<UserPreferences>,
    successMessage?: string,
  ) => {
    try {
      await updatePreferences(patch)
      if (successMessage) {
        toast.success(successMessage)
      }
    } catch {
      toast.error("Failed to save settings")
    }
  }

  const handleAutoLabelChange = async (enabled: boolean) => {
    if (!enabled) {
      try {
        await toggleMemory.mutateAsync(false)
        toast.success("Auto-labeling turned off")
      } catch {
        toast.error("Failed to update speaker settings")
      }
      return
    }

    if (!memoryStatus?.consentGiven) {
      setConsentOpen(true)
      return
    }

    try {
      await toggleMemory.mutateAsync(true)
      toast.success("Auto-labeling turned on")
    } catch {
      toast.error("Failed to update speaker settings")
    }
  }

  const handleConsent = async () => {
    try {
      await consentMutation.mutateAsync()
      await toggleMemory.mutateAsync(true)
      setConsentOpen(false)
      toast.success("Auto-labeling turned on")
    } catch {
      toast.error("Failed to enable auto-labeling")
    }
  }

  return (
    <PageContainer size="content">
      <BlurFade className="section-stack">
        <UserProfileSettings
          preferences={preferences}
          profiles={profiles}
          ready={ready}
          disabled={settingsBusy}
          onUpdate={savePreference}
        />

        <SettingsSection
          title="Language"
          description="Preferred language for the app and AI-generated content."
        >
          <SettingsRow label="Display language">
            <Select
              value={preferences.language}
              onValueChange={(value) => {
                if (value !== "en" && value !== "zh") return
                void savePreference(
                  { language: value },
                  value === "zh" ? "Language set to 中文" : "Language set to English",
                )
              }}
              disabled={settingsBusy}
            >
              <SelectTrigger className="w-full">
                <span>
                  {preferences.language === "zh" ? "中文 (Chinese)" : "English"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh">中文 (Chinese)</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
        </SettingsSection>

        <SettingsSection
          title="AI summarization"
          description="How Finch summarizes recordings on the Summary tab."
        >
          <SettingsRow
            label="Summary style"
            description="Applied when generating a transcript summary."
          >
            <Select
              value={preferences.summaryStyle}
              onValueChange={(value) => {
                if (value !== "concise" && value !== "balanced" && value !== "detailed") {
                  return
                }
                void savePreference({ summaryStyle: value })
              }}
              disabled={settingsBusy}
            >
              <SelectTrigger className="w-full">
                <span>
                  {preferences.summaryStyle === "concise"
                    ? "Concise"
                    : preferences.summaryStyle === "detailed"
                      ? "Detailed"
                      : "Balanced"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concise">Concise</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow
            label="Summary format"
            description="Paragraphs or bullet points."
          >
            <Select
              value={preferences.summaryFormat}
              onValueChange={(value) => {
                if (value !== "paragraphs" && value !== "bullets") return
                void savePreference({ summaryFormat: value })
              }}
              disabled={settingsBusy}
            >
              <SelectTrigger className="w-full">
                <span>
                  {preferences.summaryFormat === "bullets"
                    ? "Bullet points"
                    : "Paragraphs"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paragraphs">Paragraphs</SelectItem>
                <SelectItem value="bullets">Bullet points</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
        </SettingsSection>

        <LlmSettingsPanel disabled={settingsBusy} />

        <SettingsSection
          title="Speakers"
          description="Saved speaker names and automatic labeling on new recordings."
        >
          <SettingsRow
            label="Auto-label speaker names"
            description={
              autoLabelReady
                ? "Apply saved speaker names when transcribing new recordings."
                : (memoryStatus?.reason ??
                  "Speaker matching is not available on this server.")
            }
          >
            <div className="flex justify-end">
              <Switch
                checked={autoLabelEnabled}
                onCheckedChange={(checked) => void handleAutoLabelChange(checked)}
                disabled={!autoLabelReady || togglePending}
                aria-label="Auto-label speaker names"
              />
            </div>
          </SettingsRow>
          <div className="border-t border-border px-4 py-3">
            <SpeakerProfileManager
              embedded
              profiles={profiles}
              userSpeakerProfileId={preferences.userSpeakerProfileId}
              isDeleting={deleteProfile.isPending}
              isRenaming={updateProfile.isPending}
              onRename={(profileId, displayName) => {
                void updateProfile.mutateAsync({ profileId, displayName }).then(() => {
                  toast.success(`Renamed to ${displayName}`)
                })
              }}
              onDelete={(profileId, displayName) => {
                void deleteProfile.mutateAsync(profileId).then(() => {
                  toast.success(`Removed ${displayName}`)
                })
              }}
            />
          </div>
        </SettingsSection>

        <SpeakerConsentDialog
          open={consentOpen}
          onOpenChange={setConsentOpen}
          onConfirm={() => void handleConsent()}
          isPending={togglePending}
        />
      </BlurFade>
    </PageContainer>
  )
}
