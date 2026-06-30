"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { motion } from "motion/react"
import { EmptyState } from "@/components/effects/EmptyState"
import { Badge } from "@/components/ui/badge"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import { getSpeakerProfile } from "@/lib/api"
import { listStagger } from "@/lib/motion"
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
    <div className="mt-3 space-y-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
      <p>{data.embeddingDescription}</p>

      {data.embeddings.length > 0 ? (
        <div className="space-y-2">
          <p className="font-medium text-foreground">Voiceprint samples</p>
          <ul className="space-y-2">
            {data.embeddings.map((embedding) => (
              <li key={embedding.id} className="rounded-md bg-muted/30 p-2">
                <div>
                  {embedding.dimensions} dimensions · {embedding.modelId}
                </div>
                {embedding.durationSec != null ? (
                  <div>Sample length: {embedding.durationSec.toFixed(1)}s</div>
                ) : null}
                {embedding.sourceTranscriptId ? (
                  <div>
                    Source:{" "}
                    <Link
                      href={`/transcripts/${embedding.sourceTranscriptId}`}
                      className="text-foreground underline-offset-2 hover:underline"
                    >
                      transcript
                    </Link>
                    {embedding.sourceClusterId
                      ? ` (${embedding.sourceClusterId})`
                      : ""}
                  </div>
                ) : null}
                <div>Recorded: {formatDate(embedding.createdAt)}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.relatedTranscripts.length > 0 ? (
        <div className="space-y-2">
          <p className="font-medium text-foreground">Related transcripts</p>
          <ul className="space-y-1">
            {data.relatedTranscripts.map((transcript) => (
              <li key={transcript.id}>
                <Link
                  href={`/transcripts/${transcript.id}`}
                  className="text-foreground underline-offset-2 hover:underline"
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
      ) : null}
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
      <EmptyState
        title="No speaker profiles yet"
        description="Open a transcript with speaker labels and click a speaker pill on any turn to assign a name. With speaker memory enabled in Settings, the voiceprint updates from that turn automatically."
        className="py-8"
      />
    )
  }

  return (
    <ul className="space-y-3">
      {profiles.map((profile, index) => (
        <motion.li
          key={profile.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={listStagger(index)}
          className="rounded-xl border border-border bg-card/40 px-4 py-3 text-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="font-medium text-foreground">{profile.displayName}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {profile.embeddingCount} voiceprint
                  {profile.embeddingCount === 1 ? "" : "s"}
                </Badge>
                {(profile.relatedTranscriptCount ?? 0) > 0 ? (
                  <Badge variant="outline">
                    {profile.relatedTranscriptCount} transcript
                    {profile.relatedTranscriptCount === 1 ? "" : "s"}
                  </Badge>
                ) : null}
              </div>
              {profile.notes ? (
                <p className="text-xs text-muted-foreground">{profile.notes}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Updated {formatDate(profile.updatedAt)}
              </p>
            </div>
            <DeleteConfirmDialog
              title={`Delete "${profile.displayName}"?`}
              description="This removes the profile and all associated voiceprints. This cannot be undone."
              triggerLabel="Delete"
              onConfirm={() => onDelete(profile.id, profile.displayName)}
              isPending={isDeleting}
              variant="outline"
            />
          </div>
          <ProfileDetail profileId={profile.id} />
        </motion.li>
      ))}
    </ul>
  )
}
