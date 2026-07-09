import { useCallback, useRef, useState } from "react"
import { Upload } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

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
  const { t } = useTranslation()
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
        setLocalError(t("upload.unsupportedFileType"))
        return
      }
      onFileSelected(file)
    },
    [onFileSelected, t],
  )

  const displayError = error || localError

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          handleFile(event.dataTransfer.files[0])
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={cn(
          "flex min-h-52 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center transition-colors",
          dragOver ? "border-primary bg-muted/50" : "border-border bg-muted/10",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
          <Upload className="size-5" aria-hidden />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">{t("upload.dropOrBrowse")}</p>
          <p className="text-xs text-muted-foreground">{t("upload.supportedFormats")}</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          disabled={disabled}
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </div>

      {displayError ? <p className="text-sm text-destructive">{displayError}</p> : null}
    </div>
  )
}
