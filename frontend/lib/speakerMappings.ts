import type { SpeakerProfileSummary, SpeakerSegment } from "@/lib/types"

export type SpeakerCluster = {
  clusterId: string
  currentName: string
  currentProfileId?: string | null
  matchStatus?: SpeakerSegment["matchStatus"]
}

export type SpeakerDraft = {
  names: Record<string, string>
  profileIds: Record<string, string>
  enroll: Record<string, boolean>
}

export function uniqueSpeakerClusters(segments: SpeakerSegment[]): SpeakerCluster[] {
  const map = new Map<string, SpeakerCluster>()
  for (const segment of segments) {
    const clusterId = segment.clusterId || segment.speaker
    if (!map.has(clusterId)) {
      map.set(clusterId, {
        clusterId,
        currentName: segment.speaker,
        currentProfileId: segment.speakerProfileId,
        matchStatus: segment.matchStatus,
      })
    }
  }
  return Array.from(map.values())
}

export function createSpeakerDraft(clusters: SpeakerCluster[]): SpeakerDraft {
  return {
    names: Object.fromEntries(
      clusters.map((cluster) => [cluster.clusterId, cluster.currentName]),
    ),
    profileIds: Object.fromEntries(
      clusters.map((cluster) => [cluster.clusterId, cluster.currentProfileId ?? ""]),
    ),
    enroll: {},
  }
}

export function hasSpeakerDraftChanges(
  clusters: SpeakerCluster[],
  draft: SpeakerDraft,
): boolean {
  return clusters.some((cluster) => {
    const name = draft.names[cluster.clusterId] ?? cluster.currentName
    const profileId = draft.profileIds[cluster.clusterId] ?? ""
    const wantsEnroll = draft.enroll[cluster.clusterId] ?? false
    return (
      name.trim() !== cluster.currentName ||
      (profileId && profileId !== (cluster.currentProfileId ?? "")) ||
      wantsEnroll
    )
  })
}

export function buildSpeakerMappings(
  clusters: SpeakerCluster[],
  draft: SpeakerDraft,
  profiles: SpeakerProfileSummary[],
) {
  return clusters.map((cluster) => {
    const profileId = draft.profileIds[cluster.clusterId] || undefined
    const linkedProfile = profiles.find((profile) => profile.id === profileId)
    const typedName = (draft.names[cluster.clusterId] ?? cluster.currentName).trim()
    const displayName = linkedProfile?.displayName || typedName

    return {
      clusterId: cluster.clusterId,
      displayName,
      profileId: profileId || undefined,
      enroll: draft.enroll[cluster.clusterId] ?? false,
    }
  })
}
