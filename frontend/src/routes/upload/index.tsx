import { createFileRoute, Navigate } from "@tanstack/react-router"

export const Route = createFileRoute("/upload/")({
  component: () => <Navigate to="/recordings" replace />,
})
