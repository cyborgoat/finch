import { queryOptions } from "@tanstack/react-query"
import { getHealth } from "@/lib/api"

export function healthQuery() {
  return queryOptions({
    queryKey: ["health"],
    queryFn: getHealth,
  })
}
