import { createFileRoute, redirect } from "@tanstack/react-router"

type TranscriptRedirectSearch = {
  tab?: string
}

export const Route = createFileRoute("/transcripts/$id/")({
  validateSearch: (search: Record<string, unknown>): TranscriptRedirectSearch =>
    search,
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: "/files/$id",
      params: { id: params.id },
      search: search.tab === "ai" ? { tab: "ai" as const } : {},
    })
  },
})
