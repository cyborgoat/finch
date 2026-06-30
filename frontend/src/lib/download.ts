import { getAudioStreamUrl } from "@/lib/audio"

export async function downloadAudioAsset(
  audioAssetId: string,
  filename?: string,
): Promise<void> {
  const response = await fetch(getAudioStreamUrl(audioAssetId))
  if (!response.ok) {
    throw new Error("Download failed")
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename?.trim() || "recording.wav"
  anchor.click()
  URL.revokeObjectURL(url)
}
