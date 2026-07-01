import { JobProgress } from "@/components/jobs/JobProgress"
import { TextShimmer } from "@/components/motion-primitives/text-shimmer"
import type { Job } from "@/lib/types"

type NoteGeneratingPlaceholderProps = {
  templateTitle: string
  job: Job | null
  error?: string | null
}

export function NoteGeneratingPlaceholder({
  templateTitle,
  job,
  error,
}: NoteGeneratingPlaceholderProps) {
  return (
    <div className="mdx-note-editor flex min-h-[520px] flex-col justify-center gap-6 rounded-lg border border-border bg-background p-8">
      <div className="mx-auto max-w-md space-y-2 text-center">
        <p className="text-sm font-medium">
          <TextShimmer>Generating {templateTitle}…</TextShimmer>
        </p>
        <p className="text-sm text-muted-foreground">
          You can switch tabs or leave this page — generation will continue in
          the background.
        </p>
      </div>
      <div className="mx-auto w-full max-w-md">
        <JobProgress job={job} error={error} />
      </div>
    </div>
  )
}
