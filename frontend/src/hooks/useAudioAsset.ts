
import { useQuery } from "@tanstack/react-query"
import { getAudioAsset } from "@/lib/api"

export function useAudioAsset(audioAssetId: string | undefined) {
  return useQuery({
    queryKey: ["audio", audioAssetId],
    queryFn: () => getAudioAsset(audioAssetId!),
    enabled: Boolean(audioAssetId),
  })
}
