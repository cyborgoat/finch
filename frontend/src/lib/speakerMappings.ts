import type { SpeakerProfileSummary, SpeakerSegment } from "@/lib/types"

const INTERNAL_SPEAKER_ID = /^(speaker_|semb_|SPEAKER_)/i

function isInternalSpeakerId(value: string): boolean {
  return INTERNAL_SPEAKER_ID.test(value.trim())
}

export function resolveSpeakerDisplayName(
  _clusterId: string,
  options: {
    segment?: SpeakerSegment
    profiles?: SpeakerProfileSummary[]
    fallback?: string
  },
): string {
  const { segment, profiles = [], fallback = "Unknown Speaker" } = options

  const profileId = segment?.speakerProfileId?.trim() || ""

  if (profileId) {
    const profile = profiles.find((item) => item.id === profileId)
    if (profile?.displayName) {
      return profile.displayName
    }
  }

  const segmentSpeaker = segment?.speaker?.trim()
  if (segmentSpeaker) {
    if (!isInternalSpeakerId(segmentSpeaker)) {
      return segmentSpeaker
    }
    const profileBySpeakerField = profiles.find((item) => item.id === segmentSpeaker)
    if (profileBySpeakerField?.displayName) {
      return profileBySpeakerField.displayName
    }
  }

  return fallback
}
