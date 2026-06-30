"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getSpeakerProfile } from "@/lib/api"
import type { SpeakerProfileSummary } from "@/lib/types"

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

function ProfileDetail({ profileId }: { profileId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["speaker-profile", profileId],
    queryFn: () => getSpeakerProfile(profileId),
  })

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading profile details…</p>
  }

  if (!data) return null

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3 text-xs text-muted-foreground">
      <p>{data.embeddingDescription}</p>

      {data.embeddings.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-foreground">Voiceprint samples</p>
          <ul className="space-y-2">
            {data.embeddings.map((embedding) => (
              <li key={embedding.id} className="rounded-md bg-muted/30 p-2">
                <div>
                  {embedding.dimensions} dimensions · {embedding.modelId}
                </div>
                {embedding.durationSec != null && (
                  <div>Sample length: {embedding.durationSec.toFixed(1)}s</div>
                )}
                {embedding.sourceTranscriptId && (
                  <div>
                    Source:{" "}
                    <Link
                      href={`/transcripts/${embedding.sourceTranscriptId}`}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      transcript
                    </Link>
                    {embedding.sourceClusterId
                      ? ` (${embedding.sourceClusterId})`
                      : ""}
                  </div>
                )}
                <div>Recorded: {formatDate(embedding.createdAt)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.relatedTranscripts.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-foreground">Related transcripts</p>
          <ul className="space-y-1">
            {data.relatedTranscripts.map((transcript) => (
              <li key={transcript.id}>
                <Link
                  href={`/transcripts/${transcript.id}`}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {transcript.title}
                </Link>
                {" · "}
                {transcript.segmentCount} segment
                {transcript.segmentCount === 1 ? "" : "s"} ·{" "}
                {formatDate(transcript.updatedAt)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

type SpeakerProfileManagerProps = {
  profiles: SpeakerProfileSummary[]
  onDelete: (profileId: string, displayName: string) => void
  isDeleting?: boolean
}

export function SpeakerProfileManager({
  profiles,
  onDelete,
  isDeleting,
}: SpeakerProfileManagerProps) {
  if (profiles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No speaker profiles yet. Open a transcript with speaker labels, assign a
        name, and check “Remember this voice” to create one.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {profiles.map((profile) => (
        <li
          key={profile.id}
          className="rounded-md border border-border px-3 py-3 text-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="font-medium text-foreground">{profile.displayName}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {profile.embeddingCount} voiceprint
                  {profile.embeddingCount === 1 ? "" : "s"}
                </Badge>
                {(profile.relatedTranscriptCount ?? 0) > 0 && (
                  <Badge variant="outline">
                    {profile.relatedTranscriptCount} transcript
                    {profile.relatedTranscriptCount === 1 ? "" : "s"}
                  </Badge>
                )}
              </div>
              {profile.notes && (
                <p className="text-xs text-muted-foreground">{profile.notes}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Updated {formatDate(profile.updatedAt)}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={isDeleting}
              onClick={() => onDelete(profile.id, profile.displayName)}
            >
              Delete
            </Button>
          </div>
          <ProfileDetail profileId={profile.id} />
        </li>
      ))}
    </ul>
  )
}
