import { queryOptions } from "@tanstack/react-query"
import { getLlmSettings } from "@/lib/api"

export function llmSettingsQuery() {
  return queryOptions({
    queryKey: ["llm-settings"],
    queryFn: getLlmSettings,
  })
}
