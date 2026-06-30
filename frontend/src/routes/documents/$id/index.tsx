import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/documents/$id/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/files/$id",
      params: { id: params.id },
    })
  },
})
