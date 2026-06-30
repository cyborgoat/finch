import { BlurFade } from "@/components/motion-primitives/blur-fade"
import { EmptyState } from "@/components/effects/EmptyState"

export function TranscriptSummaryTab() {
  return (
    <BlurFade>
      <EmptyState
        title="Summary coming soon"
        description="An LLM-generated overview of this recording will appear here — key points, topics, and takeaways in one place."
      />
    </BlurFade>
  )
}
