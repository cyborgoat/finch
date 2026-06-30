"use client"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import type { SpeakerCluster, SpeakerDraft } from "@/lib/speakerMappings"
import { useSpeakerMemoryStatus, useSpeakerProfiles } from "@/hooks/useSpeakerProfiles"

type SpeakerRenamePanelProps = {
  clusters: SpeakerCluster[]
  draft: SpeakerDraft
  disabled?: boolean
  onDraftChange: (draft: SpeakerDraft) => void
}

export function SpeakerRenamePanel({
  clusters,
  draft,
  disabled,
  onDraftChange,
}: SpeakerRenamePanelProps) {
  const { data: memoryStatus } = useSpeakerMemoryStatus()
  const { data: profilesData } = useSpeakerProfiles()

  if (clusters.length === 0) return null

  const profiles = profilesData?.items ?? []

  const updateDraft = (partial: Partial<SpeakerDraft>) => {
    onDraftChange({ ...draft, ...partial })
  }

  const handleProfileSelect = (clusterId: string, profileId: string) => {
    const profile = profiles.find((item) => item.id === profileId)
    updateDraft({
      profileIds: { ...draft.profileIds, [clusterId]: profileId },
      names: {
        ...draft.names,
        [clusterId]: profile?.displayName ?? draft.names[clusterId] ?? "",
      },
    })
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <p className="text-sm font-medium">Speaker names</p>
      <p className="text-xs text-muted-foreground">
        Match unknown speakers to a saved profile or type a new name. Changes are saved
        with the main Save button above.
      </p>
      <div className="space-y-4">
        {clusters.map((cluster) => {
          const selectedProfileId = draft.profileIds[cluster.clusterId] ?? ""
          const useExisting = Boolean(selectedProfileId)

          return (
            <div
              key={cluster.clusterId}
              className="space-y-2 rounded-md border border-border/60 bg-background/40 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                {cluster.matchStatus === "matched" && (
                  <Badge variant="default">Matched</Badge>
                )}
                {cluster.matchStatus === "unknown" && (
                  <Badge variant="secondary">Unknown</Badge>
                )}
                {cluster.matchStatus === "manual" && (
                  <Badge variant="outline">Manual</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  Cluster {cluster.clusterId}
                </span>
              </div>

              {profiles.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Match to saved profile
                  </label>
                  <select
                    className="flex h-9 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
                    disabled={disabled}
                    value={selectedProfileId}
                    onChange={(event) => {
                      const value = event.target.value
                      if (!value) {
                        updateDraft({
                          profileIds: { ...draft.profileIds, [cluster.clusterId]: "" },
                        })
                        return
                      }
                      handleProfileSelect(cluster.clusterId, value)
                    }}
                  >
                    <option value="">— New name (type below) —</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.displayName} ({profile.embeddingCount} voiceprint
                        {profile.embeddingCount === 1 ? "" : "s"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {useExisting ? "Display name (from profile)" : "Display name"}
                </label>
                <Input
                  value={draft.names[cluster.clusterId] ?? cluster.currentName}
                  disabled={disabled || useExisting}
                  onChange={(event) =>
                    updateDraft({
                      names: {
                        ...draft.names,
                        [cluster.clusterId]: event.target.value,
                      },
                      profileIds: { ...draft.profileIds, [cluster.clusterId]: "" },
                    })
                  }
                  className="max-w-md"
                  placeholder="e.g. Robert"
                />
              </div>

              {memoryStatus?.enabled && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={draft.enroll[cluster.clusterId] ?? false}
                    disabled={disabled}
                    onChange={(event) =>
                      updateDraft({
                        enroll: {
                          ...draft.enroll,
                          [cluster.clusterId]: event.target.checked,
                        },
                      })
                    }
                  />
                  Remember this voice from this recording (adds voiceprint sample)
                </label>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
