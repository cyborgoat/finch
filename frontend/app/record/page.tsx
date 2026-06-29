"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AudioRecorder } from "@/components/audio/AudioRecorder"
import { JobProgress } from "@/components/jobs/JobProgress"
import { PipelineStepper } from "@/components/jobs/PipelineStepper"
import { Button } from "@/components/ui/button"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import { useAudioUpload } from "@/hooks/useAudioUpload"
import { useJobPolling } from "@/hooks/useJobPolling"
import { useInvalidateTranscripts } from "@/hooks/useTranscripts"
import { createTranscriptJob } from "@/lib/api"

export default function RecordPage() {
  const router = useRouter()
  const invalidateTranscripts = useInvalidateTranscripts()
  const recorder = useAudioRecorder()
  const { upload, isUploading } = useAudioUpload()
  const [jobId, setJobId] = useState<string | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [uploadedAssetId, setUploadedAssetId] = useState<string | null>(null)

  const onCompleted = useCallback(
    (resultId: string | null | undefined) => {
      if (resultId) {
        toast.success("Transcription complete")
        router.push(`/transcripts/${resultId}`)
      }
    },
    [router],
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
      const { jobId: newJobId, transcriptId } = await createTranscriptJob({
        audioAssetId: asset.id,
        language: "auto",
      })
      setJobId(newJobId)
      invalidateTranscripts()
      toast.message("Transcription started")
      router.push(`/transcripts/${transcriptId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to transcribe")
    } finally {
      setIsTranscribing(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Record voice</h1>
        <p className="text-sm text-muted-foreground">
          Record in the browser, then transcribe locally.
        </p>
      </div>

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

      {recorder.audioBlob && recorder.state === "stopped" && (
        <Button
          onClick={() => void handleTranscribe()}
          disabled={isUploading || isTranscribing || !!jobId}
        >
          {isUploading || isTranscribing ? "Processing…" : "Transcribe recording"}
        </Button>
      )}
    </div>
  )
}
