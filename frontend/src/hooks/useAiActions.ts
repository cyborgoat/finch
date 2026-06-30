
import { useQuery } from "@tanstack/react-query"
import { listAiActionTemplates } from "@/lib/api"

export function useAiActionTemplates() {
  return useQuery({
    queryKey: ["ai-action-templates"],
    queryFn: listAiActionTemplates,
  })
}
