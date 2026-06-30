import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { SpeakerConsentDialog } from "@/components/speakers/SpeakerConsentDialog"
import { SpeakerProfileManager } from "@/components/speakers/SpeakerProfileManager"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { BlurFade } from "@/components/motion-primitives/blur-fade"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  useDeleteSpeakerMemoryData,
  useDeleteSpeakerProfile,
  useRecordSpeakerConsent,
  useSpeakerMemoryStatus,
  useSpeakerProfiles,
  useToggleSpeakerMemory,
} from "@/hooks/useSpeakerProfiles"
import { healthQuery } from "@/lib/queries/health"
import {
  speakerMemoryStatusQuery,
  speakerProfilesQuery,
} from "@/lib/queries/speakers"

export const Route = createFileRoute("/settings/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(healthQuery()),
      context.queryClient.ensureQueryData(speakerMemoryStatusQuery()),
      context.queryClient.ensureQueryData(speakerProfilesQuery()),
    ]),
  component: SettingsPage,
})

function SettingsPage() {
  const { data, isError, isLoading } = useQuery(healthQuery())
  const { data: memoryStatus } = useSpeakerMemoryStatus()
  const { data: profilesData } = useSpeakerProfiles()
  const toggleMemory = useToggleSpeakerMemory()
  const consentMutation = useRecordSpeakerConsent()
  const deleteProfile = useDeleteSpeakerProfile()
  const deleteAllData = useDeleteSpeakerMemoryData()
  const [consentOpen, setConsentOpen] = useState(false)

  const handleToggle = async (enabled: boolean) => {
    if (enabled && !memoryStatus?.consentGiven) {
      setConsentOpen(true)
      return
    }
    try {
      await toggleMemory.mutateAsync(enabled)
      toast.success(enabled ? "Speaker memory enabled" : "Speaker memory disabled")
    } catch {
      toast.error("Failed to update speaker memory")
    }
  }

  const handleConsent = async () => {
    try {
      await consentMutation.mutateAsync()
      await toggleMemory.mutateAsync(true)
      setConsentOpen(false)
      toast.success("Speaker memory enabled")
    } catch {
      toast.error("Failed to enable speaker memory")
    }
  }

  return (
    <PageContainer size="list">
      <BlurFade className="section-stack max-w-2xl">
        <PageHeader
          title="Settings"
          description="Local configuration and privacy information."
        />

        <Card className="rounded-xl border bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">Backend status</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm">
            {isLoading ? (
              <span className="text-muted-foreground">Checking…</span>
            ) : isError ? (
              <Badge variant="destructive">Offline</Badge>
            ) : (
              <>
                <Badge variant="default">Online</Badge>
                <span className="text-muted-foreground">{data?.app}</span>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">ASR model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {data?.capabilities ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={data.capabilities.asrMock ? "secondary" : "default"}>
                  {data.capabilities.asrMock ? "Mock mode" : "Real transcription"}
                </Badge>
              </div>
            ) : null}
            <p>
              Transcription runs locally with Qwen3-ASR-1.7B. Configure in backend{" "}
              <code className="text-xs">.env</code> (ASR_MODEL_ID, ASR_MOCK=false for real ASR).
              Check the backend terminal on startup for dependency and configuration details.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">Speaker diarization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {data?.capabilities ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      data.capabilities.diarizationReady ? "default" : "secondary"
                    }
                  >
                    {data.capabilities.diarizationReady
                      ? "Ready for speaker labels"
                      : "Not configured"}
                  </Badge>
                  {data.capabilities.diarizationEnabled && (
                    <Badge variant="outline">Enabled</Badge>
                  )}
                </div>
                {data.capabilities.diarizationReason && (
                  <p className="text-amber-700 dark:text-amber-400">
                    {data.capabilities.diarizationReason}
                  </p>
                )}
              </>
            ) : null}
            <p>
              Transcripts show speaker labels when diarization runs. Set{" "}
              <code className="text-xs">HF_TOKEN</code> in{" "}
              <code className="text-xs">.env</code>, then re-transcribe.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">Speaker memory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            {memoryStatus ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={memoryStatus.enabled ? "default" : "secondary"}>
                  {memoryStatus.enabled ? "Enabled" : "Disabled"}
                </Badge>
                <Badge variant={memoryStatus.consentGiven ? "default" : "outline"}>
                  {memoryStatus.consentGiven ? "Consent given" : "Consent required"}
                </Badge>
                {memoryStatus.ready ? (
                  <Badge variant="default">Ready</Badge>
                ) : (
                  <Badge variant="secondary">Not ready</Badge>
                )}
              </div>
            ) : null}
            {memoryStatus?.reason && (
              <p className="text-amber-700 dark:text-amber-400">{memoryStatus.reason}</p>
            )}
            <p>
              Remember speaker names across transcripts using local voice embeddings.
              Enable here, then click speaker labels on any transcript turn to assign names
              and update voiceprints. Requires diarization.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={memoryStatus?.enabled ? "secondary" : "default"}
                disabled={toggleMemory.isPending}
                onClick={() => void handleToggle(!memoryStatus?.enabled)}
              >
                {memoryStatus?.enabled ? "Disable speaker memory" : "Enable speaker memory"}
              </Button>
              <DeleteConfirmDialog
                title="Delete all voiceprints?"
                description="Delete all speaker profiles and voiceprints? This cannot be undone."
                triggerLabel="Delete all voiceprints"
                confirmLabel="Delete all"
                onConfirm={() => {
                  void deleteAllData.mutateAsync().then(() => {
                    toast.success("All speaker memory data deleted")
                  })
                }}
                isPending={deleteAllData.isPending}
              />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">Voice profiles</p>
              <ScrollArea className="max-h-[420px] pr-3">
                <SpeakerProfileManager
                  profiles={profilesData?.items ?? []}
                  isDeleting={deleteProfile.isPending}
                  onDelete={(profileId, displayName) => {
                    void deleteProfile.mutateAsync(profileId).then(() => {
                      toast.success(`Deleted ${displayName}`)
                    })
                  }}
                />
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">OpenRouter / LLM</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {data?.capabilities ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={data.capabilities.llmMock ? "secondary" : "default"}>
                  {data.capabilities.llmMock ? "Mock mode" : "OpenRouter"}
                </Badge>
                {!data.capabilities.llmMock && (
                  <Badge
                    variant={
                      data.capabilities.openrouterConfigured ? "default" : "destructive"
                    }
                  >
                    {data.capabilities.openrouterConfigured
                      ? "API key configured"
                      : "API key missing"}
                  </Badge>
                )}
              </div>
            ) : null}
            <p>
              AI actions use OpenRouter. Set <code className="text-xs">OPENROUTER_API_KEY</code>{" "}
              in backend <code className="text-xs">.env</code>. Use{" "}
              <code className="text-xs">LLM_MOCK=true</code> for development without API calls.
            </p>
            <p>Only transcript text is sent to the LLM—not audio.</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">Privacy</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Audio stays on your machine for transcription and optional diarization.
            Speaker voiceprints are stored locally only when you consent. LLM features
            are optional and only process text you explicitly send via AI actions.
          </CardContent>
        </Card>

        <SpeakerConsentDialog
          open={consentOpen}
          onOpenChange={setConsentOpen}
          onConfirm={() => void handleConsent()}
          isPending={consentMutation.isPending || toggleMemory.isPending}
        />
      </BlurFade>
    </PageContainer>
  )
}
