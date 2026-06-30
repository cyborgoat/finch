import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/transcripts/")({
  beforeLoad: () => {
    throw redirect({ to: "/files" })
  },
})
