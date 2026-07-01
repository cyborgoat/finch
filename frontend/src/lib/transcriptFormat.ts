import type { SpeakerProfileSummary, SpeakerSegment, Transcript } from "@/lib/types"

const SPEAKER_BLOCK_PATTERN =
  /(?:^|\n\n)([^:]+):\s*([\s\S]*?)(?=(?:\n\n[^:]+:)|$)/g

export type ProfileNameLookup = Record<string, string>

export function profileNameById(
  profiles: Pick<SpeakerProfileSummary, "id" | "displayName">[],
): ProfileNameLookup {
  return Object.fromEntries(profiles.map((profile) => [profile.id, profile.displayName]))
}

export function resolveSegmentSpeaker(
  segment: SpeakerSegment,
  profileNames: ProfileNameLookup = {},
): string {
  if (segment.speakerProfileId) {
    return profileNames[segment.speakerProfileId] ?? segment.speaker
  }
  return segment.speaker
}

export function parseSpeakerLabeledText(text: string): SpeakerSegment[] {
  const segments: SpeakerSegment[] = []
  const trimmed = text.trim()
  if (!trimmed) return segments

  for (const match of trimmed.matchAll(SPEAKER_BLOCK_PATTERN)) {
    const speaker = match[1]?.trim()
    const segmentText = match[2]?.trim()
    if (!speaker || !segmentText) continue
    segments.push({
      speaker,
      startSec: 0,
      endSec: 0,
      text: segmentText,
    })
  }

  return segments
}

export function resolveSpeakerSegments(
  transcript: Pick<Transcript, "speakerSegments" | "rawText" | "editedText">,
): SpeakerSegment[] {
  if (transcript.speakerSegments && transcript.speakerSegments.length > 0) {
    return transcript.speakerSegments
  }

  const labeledSource = transcript.editedText?.trim() || transcript.rawText
  return parseSpeakerLabeledText(labeledSource)
}

export function formatSpeakerTranscript(
  segments: SpeakerSegment[],
  profileNames: ProfileNameLookup = {},
): string {
  return segments
    .map((segment) => {
      const text = segment.text.trim()
      if (!text) return null
      return `${resolveSegmentSpeaker(segment, profileNames)}: ${text}`
    })
    .filter((line): line is string => line !== null)
    .join("\n\n")
}

export function transcriptDisplayText(
  rawText: string,
  editedText: string | null | undefined,
  speakerSegments?: SpeakerSegment[] | null,
  profileNames: ProfileNameLookup = {},
): string {
  if (editedText?.trim()) {
    const parsedEdited = parseSpeakerLabeledText(editedText)
    if (parsedEdited.length > 0) {
      return formatSpeakerTranscript(parsedEdited, profileNames)
    }
    return editedText
  }
  if (speakerSegments && speakerSegments.length > 0) {
    const labeled = formatSpeakerTranscript(speakerSegments, profileNames)
    if (labeled) {
      return labeled
    }
  }
  const parsedRaw = parseSpeakerLabeledText(rawText)
  if (parsedRaw.length > 0) {
    return formatSpeakerTranscript(parsedRaw, profileNames)
  }
  return rawText
}
