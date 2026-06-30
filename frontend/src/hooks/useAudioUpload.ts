
import { useCallback, useState } from "react"
import { uploadAudio, FinchApiError } from "@/lib/api"
import type { AudioAsset } from "@/lib/types"

export function useAudioUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioAsset, setAudioAsset] = useState<AudioAsset | null>(null)

  const upload = useCallback(
    async (file: File, source: "upload" | "recording") => {
      setIsUploading(true)
      setError(null)
      try {
        const asset = await uploadAudio(file, source)
        setAudioAsset(asset)
        return asset
      } catch (err) {
        const message =
          err instanceof FinchApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Upload failed"
        setError(message)
        throw err
      } finally {
        setIsUploading(false)
      }
    },
    [],
  )

  const reset = useCallback(() => {
    setAudioAsset(null)
    setError(null)
  }, [])

  return { upload, isUploading, error, audioAsset, reset }
}
