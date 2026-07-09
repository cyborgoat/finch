import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { AudioDialogFooter } from "@/components/audio/AudioDialogControls"
import { AudioUploader } from "@/components/audio/AudioUploader"
import { formatBytes, formatDuration } from "@/lib/format"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

  const handleReset = () => {
    reset()
    setAsset(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        {open ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("upload.dialogTitle")}</DialogTitle>
              <DialogDescription>{t("upload.dialogDescription")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">{t("upload.uploadHint")}</p>

              <AudioUploader
                onFileSelected={(file) => void handleFileSelected(file)}
                disabled={busy}
                error={error}
              />

              {asset ? (
                <div className="surface-inset grid gap-2 p-4 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("upload.nameLabel")}</p>
                    <p className="truncate font-medium">{asset.filename}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("upload.sizeLabel")}</p>
                    <p className="font-medium">{formatBytes(asset.sizeBytes)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("upload.durationLabel")}</p>
                    <p className="font-medium">
                      {formatDuration(asset.durationSeconds, t("common.notAvailable"))}
                    </p>
                  </div>
                </div>
              ) : null}

              <AudioDialogFooter className="justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={busy}
                >
                  {t("common.cancel")}
                </Button>
                <div className="flex flex-wrap gap-2">
                  {asset ? (
                    <Button type="button" variant="ghost" onClick={handleReset} disabled={busy}>
                      {t("common.reset")}
                    </Button>
                  ) : null}
                  <Button type="button" onClick={() => void handleSave()} disabled={!asset || busy}>
                    {busy ? t("common.saving") : t("upload.saveToLibrary")}
                  </Button>
                </div>
              </AudioDialogFooter>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
