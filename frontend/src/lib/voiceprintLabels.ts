import type { VoiceprintProfileSummary, SpeakerSegment } from "@/lib/types"

const INTERNAL_SPEAKER_ID = /^(voiceprint_|speaker_|semb_|SPEAKER_)/i

function isInternalSpeakerId(value: string): boolean {
  return INTERNAL_SPEAKER_ID.test(value.trim())
}

export function resolveSpeakerDisplayName(
  _clusterId: string,
  options: {
    segment?: SpeakerSegment
    profiles?: VoiceprintProfileSummary[]
    fallback?: string
  },
): string {
  const { segment, profiles = [], fallback = "Unknown Speaker" } = options

  const voiceprintProfileId = segment?.voiceprintProfileId?.trim() || ""

  if (voiceprintProfileId) {
    const profile = profiles.find((item) => item.id === voiceprintProfileId)
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
