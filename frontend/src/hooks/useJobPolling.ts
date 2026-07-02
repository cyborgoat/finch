
import { useEffect, useRef, useState } from "react"
import { getJob } from "@/lib/api"
import type { Job } from "@/lib/types"

type UseJobPollingOptions = {
  enabled?: boolean
  onCompleted?: (job: Job) => void
  onFailed?: (job: Job) => void
}

function isTerminalJobStatus(status: Job["status"]) {
  return status === "completed" || status === "failed"
}

export function useJobPolling(
  jobId: string | null,
  options?: UseJobPollingOptions,
) {
  const { enabled = true, onCompleted, onFailed } = options ?? {}
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState<string | null>(null)
  const callbacksRef = useRef({ onCompleted, onFailed })
  const notifiedRef = useRef<string | null>(null)

  useEffect(() => {
    callbacksRef.current = { onCompleted, onFailed }
  }, [onCompleted, onFailed])

  useEffect(() => {
    setJob(null)
    setError(null)
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
        setJob(next)
        setError(null)

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
        setError(err instanceof Error ? err.message : "Failed to poll job")
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

  const isPolling =
    !!jobId &&
    enabled &&
    (!job || job.status === "queued" || job.status === "processing")

  return { job, error, isPolling }
}
