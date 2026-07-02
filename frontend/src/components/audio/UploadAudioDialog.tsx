import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  AudioUploader,
  formatBytes,
  formatDuration,
} from "@/components/audio/AudioUploader"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAudioUpload } from "@/hooks/useAudioUpload"
import {
  useCreateRecording,
  useInvalidateRecordings,
} from "@/hooks/useRecordings"
import type { AudioAsset } from "@/lib/types"

type UploadAudioDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UploadAudioDialog({ open, onOpenChange }: UploadAudioDialogProps) {
  const { t } = useTranslation()
  const invalidateRecordings = useInvalidateRecordings()
  const createRecordingMutation = useCreateRecording()
  const { upload, isUploading, error, reset } = useAudioUpload()
  const [asset, setAsset] = useState<AudioAsset | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const busy = isUploading || isSaving || createRecordingMutation.isPending

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset()
      setAsset(null)
      setIsSaving(false)
    }
    onOpenChange(nextOpen)
  }

  const handleFileSelected = async (file: File) => {
    try {
      const uploaded = await upload(file, "upload")
      setAsset(uploaded)
    } catch {
      toast.error(t("toasts.uploadFailed"))
    }
  }

  const handleSave = async () => {
    if (!asset) return
    setIsSaving(true)
    try {
      await createRecordingMutation.mutateAsync({ audioAssetId: asset.id })
      invalidateRecordings()
      toast.success(t("toasts.recordingSaved"))
      handleOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toasts.failedToSaveRecording"))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("upload.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("upload.dialogDescription")}</DialogDescription>
        </DialogHeader>

        <AudioUploader
          onFileSelected={(file) => void handleFileSelected(file)}
          disabled={busy}
          error={error}
        />

        {asset ? (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">{t("upload.nameLabel")}</span>{" "}
              {asset.filename}
            </p>
            <p>
              <span className="text-muted-foreground">{t("upload.sizeLabel")}</span>{" "}
              {formatBytes(asset.sizeBytes)}
            </p>
            <p>
              <span className="text-muted-foreground">{t("upload.durationLabel")}</span>{" "}
              {formatDuration(asset.durationSeconds, t("common.notAvailable"))}
            </p>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-start">
          <Button onClick={() => void handleSave()} disabled={!asset || busy}>
            {busy ? t("common.saving") : t("upload.saveToLibrary")}
          </Button>
          {asset ? (
            <Button
              variant="outline"
              onClick={() => {
                reset()
                setAsset(null)
              }}
              disabled={busy}
            >
              {t("common.reset")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
