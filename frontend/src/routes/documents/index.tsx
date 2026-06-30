import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/documents/")({
  beforeLoad: () => {
    throw redirect({ to: "/files" })
  },
})
