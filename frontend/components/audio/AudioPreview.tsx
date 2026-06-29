"use client"

type AudioPreviewProps = {
  audioUrl: string | null
}

export function AudioPreview({ audioUrl }: AudioPreviewProps) {
  if (!audioUrl) return null
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-2 text-sm font-medium">Preview</p>
      <audio controls src={audioUrl} className="w-full" />
    </div>
  )
}
