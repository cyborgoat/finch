import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { AudioRecorder } from "@/components/audio/AudioRecorder"
import { JobProgress } from "@/components/jobs/JobProgress"
import { PipelineStepper } from "@/components/jobs/PipelineStepper"
import { PageContainer } from "@/components/layout/PageContainer"
import { BlurFade } from "@/components/motion-primitives/blur-fade"
import { Button } from "@/components/ui/button"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import { useAudioUpload } from "@/hooks/useAudioUpload"
import { useJobPolling } from "@/hooks/useJobPolling"
import { useInvalidateRecordings } from "@/hooks/useRecordings"
import { createRecordingJob } from "@/lib/api"

export const Route = createFileRoute("/record/")({
  component: RecordPage,
})

function RecordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const invalidateRecordings = useInvalidateRecordings()
  const recorder = useAudioRecorder()
  const { upload, isUploading } = useAudioUpload()
  const [jobId, setJobId] = useState<string | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [uploadedAssetId, setUploadedAssetId] = useState<string | null>(null)

  const onCompleted = useCallback(
    (resultId: string | null | undefined) => {
      if (resultId) {
        toast.success(t("toasts.transcriptionComplete"))
        void navigate({ to: "/recordings/$id", params: { id: resultId } })
      }
    },
    [navigate, t],
  )

  const { job, error: pollError } = useJobPolling(jobId, {
    enabled: !!jobId,
    onCompleted: (j) => {
      invalidateRecordings()
      onCompleted(j.resultId)
    },
    onFailed: (j) => {
      invalidateRecordings()
      toast.error(j.error ?? t("toasts.transcriptionFailed"))
    },
  })

  const displayStep: 0 | 1 | 2 =
    job?.status === "completed" ? 2 : uploadedAssetId ? 1 : 0

  const handleTranscribe = async () => {
    if (!recorder.audioBlob) return
    setIsTranscribing(true)
    try {
      const file = new File(
        [recorder.audioBlob],
        `recording-${Date.now()}.webm`,
        {
          type: (recorder.audioBlob.type || "audio/webm").split(";", 1)[0],
        },
      )
      const asset = await upload(file, "recording")
      setUploadedAssetId(asset.id)
      const { jobId: newJobId, recordingId } = await createRecordingJob({
        audioAssetId: asset.id,
        language: "auto",
      })
      setJobId(newJobId)
      invalidateRecordings()
      toast.message(t("toasts.transcriptionStarted"))
      void navigate({
        to: "/recordings/$id",
        params: { id: recordingId },
        search: { jobId: newJobId },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toasts.failedToTranscribe"))
    } finally {
      setIsTranscribing(false)
    }
  }

  return (
    <PageContainer size="wide" contentWidth="content">
      <BlurFade className="section-stack">
        <PipelineStepper current={displayStep} />

        <AudioRecorder
          state={recorder.state}
          durationSeconds={recorder.durationSeconds}
          audioUrl={recorder.audioUrl}
          audioBlob={recorder.audioBlob}
          mediaStream={recorder.mediaStream}
          error={recorder.error}
          onStart={() => void recorder.start()}
          onPause={recorder.pause}
          onResume={recorder.resume}
          onStop={recorder.stop}
          onReset={() => {
            recorder.reset()
            setJobId(null)
            setUploadedAssetId(null)
          }}
        />

        <JobProgress job={job} error={pollError} />

        {recorder.audioBlob && recorder.state === "stopped" ? (
          <Button
            onClick={() => void handleTranscribe()}
            disabled={isUploading || isTranscribing || !!jobId}
          >
            {isUploading || isTranscribing
              ? t("common.processing")
              : t("record.transcribeRecording")}
          </Button>
        ) : null}
      </BlurFade>
    </PageContainer>
  )
}
