
import { useEffect, useRef, useState } from "react"
import { getJob } from "@/lib/api"
import type { Job } from "@/lib/types"

type UseJobPollingOptions = {
  enabled?: boolean
  onCompleted?: (job: Job) => void
  onFailed?: (job: Job) => void
}

type PollState = {
  jobId: string | null
  job: Job | null
  error: string | null
}

function isTerminalJobStatus(status: Job["status"]) {
  return status === "completed" || status === "failed"
}

export function useJobPolling(
  jobId: string | null,
  options?: UseJobPollingOptions,
) {
  const { enabled = true, onCompleted, onFailed } = options ?? {}
  const [pollState, setPollState] = useState<PollState>({
    jobId,
    job: null,
    error: null,
  })
  const callbacksRef = useRef({ onCompleted, onFailed })
  const notifiedRef = useRef<string | null>(null)

  useEffect(() => {
    callbacksRef.current = { onCompleted, onFailed }
  }, [onCompleted, onFailed])

  if (jobId !== pollState.jobId) {
    setPollState({ jobId, job: null, error: null })
  }

  useEffect(() => {
    notifiedRef.current = null
  }, [jobId])

  useEffect(() => {
    if (!jobId || !enabled) return

    let cancelled = false
    let intervalId: number | undefined

    const poll = async () => {
      if (cancelled) return
      try {
        const next = await getJob(jobId)
        if (cancelled) return
        setPollState({ jobId, job: next, error: null })

        if (next.status === "completed" && notifiedRef.current !== jobId) {
          notifiedRef.current = jobId
          callbacksRef.current.onCompleted?.(next)
        }
        if (next.status === "failed" && notifiedRef.current !== jobId) {
          notifiedRef.current = jobId
          callbacksRef.current.onFailed?.(next)
        }

        if (isTerminalJobStatus(next.status) && intervalId !== undefined) {
          window.clearInterval(intervalId)
          intervalId = undefined
        }
      } catch (err) {
        if (cancelled) return
        setPollState({
          jobId,
          job: null,
          error: err instanceof Error ? err.message : "Failed to poll job",
        })
      }
    }

    void poll()
    intervalId = window.setInterval(() => {
      void poll()
    }, 1000)

    return () => {
      cancelled = true
      if (intervalId !== undefined) {
        window.clearInterval(intervalId)
      }
    }
  }, [jobId, enabled])

  const job = pollState.jobId === jobId ? pollState.job : null
  const error = pollState.jobId === jobId ? pollState.error : null
  const isPolling =
    !!jobId &&
    enabled &&
    (!job || job.status === "queued" || job.status === "processing")

  return { job, error, isPolling }
}
