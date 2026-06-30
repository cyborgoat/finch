import { queryOptions } from "@tanstack/react-query"
import { getUserSettings } from "@/lib/api"

export function userSettingsQuery() {
  return queryOptions({
    queryKey: ["user-settings"],
    queryFn: getUserSettings,
  })
}
