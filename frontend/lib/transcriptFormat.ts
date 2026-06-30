import type { SpeakerSegment, Transcript } from "@/lib/types"

const SPEAKER_BLOCK_PATTERN =
  /(?:^|\n\n)([^:]+):\s*([\s\S]*?)(?=(?:\n\n[^:]+:)|$)/g

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

export function formatSpeakerTranscript(segments: SpeakerSegment[]): string {
  return segments
    .map((segment) => {
      const text = segment.text.trim()
      if (!text) return null
      return `${segment.speaker}: ${text}`
    })
    .filter((line): line is string => line !== null)
    .join("\n\n")
}

export function transcriptDisplayText(
  rawText: string,
  editedText: string | null | undefined,
  speakerSegments?: SpeakerSegment[] | null,
): string {
  if (editedText?.trim()) {
    const parsedEdited = parseSpeakerLabeledText(editedText)
    if (parsedEdited.length > 0) {
      return formatSpeakerTranscript(parsedEdited)
    }
    return editedText
  }
  if (speakerSegments && speakerSegments.length > 0) {
    const labeled = formatSpeakerTranscript(speakerSegments)
    if (labeled) {
      return labeled
    }
  }
  const parsedRaw = parseSpeakerLabeledText(rawText)
  if (parsedRaw.length > 0) {
    return formatSpeakerTranscript(parsedRaw)
  }
  return rawText
}
