"use client"

import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const ACCEPTED = ".wav,.mp3,.m4a,.webm,.ogg,.flac"

type AudioUploaderProps = {
  onFileSelected: (file: File) => void
  disabled?: boolean
  error?: string | null
}

export function AudioUploader({
  onFileSelected,
  disabled,
  error,
}: AudioUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return
      setLocalError(null)
      const ext = file.name.split(".").pop()?.toLowerCase()
      const allowed = ["wav", "mp3", "m4a", "webm", "ogg", "flac"]
      if (!ext || !allowed.includes(ext)) {
        setLocalError("Unsupported file type.")
        return
      }
      onFileSelected(file)
    },
    [onFileSelected],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Select audio file</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFile(e.dataTransfer.files[0])
          }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
          }}
          className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors ${
            dragOver ? "border-primary bg-muted/50" : "border-border"
          } ${disabled ? "pointer-events-none opacity-50" : ""}`}
        >
          <p className="text-sm font-medium">Drop audio here or click to browse</p>
          <p className="mt-1 text-xs text-muted-foreground">
            WAV, MP3, M4A, WEBM, OGG, FLAC
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            disabled={disabled}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
        {(error || localError) && (
          <p className="text-sm text-destructive">{error || localError}</p>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Choose file
        </Button>
      </CardContent>
    </Card>
  )
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDuration(seconds?: number) {
  if (seconds == null) return "—"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}
