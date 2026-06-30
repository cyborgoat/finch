import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import {
  AudioUploader,
  formatBytes,
  formatDuration,
} from "@/components/audio/AudioUploader"
import { JobProgress } from "@/components/jobs/JobProgress"
import { PipelineStepper } from "@/components/jobs/PipelineStepper"
import { PageContainer } from "@/components/layout/PageContainer"
import { BlurFade } from "@/components/motion-primitives/blur-fade"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAudioUpload } from "@/hooks/useAudioUpload"
import { useJobPolling } from "@/hooks/useJobPolling"
import { useInvalidateTranscripts } from "@/hooks/useTranscripts"
import { createTranscriptJob } from "@/lib/api"
import type { AudioAsset } from "@/lib/types"

export const Route = createFileRoute("/upload/")({
  component: UploadPage,
})

function UploadPage() {
  const navigate = useNavigate()
  const invalidateTranscripts = useInvalidateTranscripts()
  const { upload, isUploading, error, reset } = useAudioUpload()
  const [asset, setAsset] = useState<AudioAsset | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)

  const onCompleted = useCallback(
    (resultId: string | null | undefined) => {
      if (resultId) {
        toast.success("Transcription complete")
        void navigate({ to: "/files/$id", params: { id: resultId } })
      }
    },
    [navigate],
  )

  const { job, error: pollError } = useJobPolling(jobId, {
    enabled: !!jobId,
    onCompleted: (j) => {
      invalidateTranscripts()
      onCompleted(j.resultId)
    },
    onFailed: (j) => {
      invalidateTranscripts()
      toast.error(j.error ?? "Transcription failed")
    },
  })

  const displayStep: 0 | 1 | 2 =
    job?.status === "completed" ? 2 : asset ? 1 : 0

  const handleFileSelected = async (file: File) => {
    setJobId(null)
    try {
      const uploaded = await upload(file, "upload")
      setAsset(uploaded)
      toast.success("Audio uploaded")
    } catch {
      toast.error("Upload failed")
    }
  }

  const handleTranscribe = async () => {
    if (!asset) return
    setIsTranscribing(true)
    try {
      const { jobId: newJobId, transcriptId } = await createTranscriptJob({
        audioAssetId: asset.id,
        language: "auto",
      })
      setJobId(newJobId)
      invalidateTranscripts()
      toast.message("Transcription started")
      void navigate({
        to: "/files/$id",
        params: { id: transcriptId },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start job")
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleReset = () => {
    reset()
    setAsset(null)
    setJobId(null)
  }

  return (
    <PageContainer size="wide" contentWidth="content">
      <BlurFade className="section-stack">
        <PipelineStepper current={displayStep} />

        <AudioUploader
          onFileSelected={(file) => void handleFileSelected(file)}
          disabled={isUploading || isTranscribing || !!jobId}
          error={error}
        />

        {asset ? (
          <Card className="rounded-xl border bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">File preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Name:</span> {asset.filename}
              </p>
              <p>
                <span className="text-muted-foreground">Size:</span>{" "}
                {formatBytes(asset.sizeBytes)}
              </p>
              <p>
                <span className="text-muted-foreground">Duration:</span>{" "}
                {formatDuration(asset.durationSeconds)}
              </p>
            </CardContent>
          </Card>
        ) : null}

        <JobProgress job={job} error={pollError} />

        <div className="flex gap-2">
          <Button
            onClick={() => void handleTranscribe()}
            disabled={!asset || isTranscribing || !!jobId}
          >
            {isTranscribing ? "Starting…" : "Transcribe"}
          </Button>
          {asset ? (
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          ) : null}
        </div>
      </BlurFade>
    </PageContainer>
  )
}
