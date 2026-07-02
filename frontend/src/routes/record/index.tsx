import { createFileRoute, Navigate } from "@tanstack/react-router"

export const Route = createFileRoute("/record/")({
  component: () => <Navigate to="/recordings" replace />,
})
