"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getJob } from "@/lib/api"
import type { Job } from "@/lib/types"

type UseJobPollingOptions = {
  enabled?: boolean
  onCompleted?: (job: Job) => void
  onFailed?: (job: Job) => void
}

export function useJobPolling(
  jobId: string | null,
  options?: UseJobPollingOptions,
) {
  const { enabled = true, onCompleted, onFailed } = options ?? {}
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState<string | null>(null)
  const callbacksRef = useRef({ onCompleted, onFailed })

  useEffect(() => {
    callbacksRef.current = { onCompleted, onFailed }
  }, [onCompleted, onFailed])

  const poll = useCallback(async () => {
    if (!jobId) return
    try {
      const next = await getJob(jobId)
      setJob(next)
      setError(null)
      if (next.status === "completed") {
        callbacksRef.current.onCompleted?.(next)
      }
      if (next.status === "failed") {
        callbacksRef.current.onFailed?.(next)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to poll job")
    }
  }, [jobId])

  useEffect(() => {
    if (!jobId || !enabled) return
    const timeout = window.setTimeout(() => {
      void poll()
    }, 0)
    const interval = window.setInterval(() => {
      void poll()
    }, 1000)
    return () => {
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [jobId, enabled, poll])

  const isPolling =
    !!jobId &&
    enabled &&
    (!job || job.status === "queued" || job.status === "processing")

  return { job, error, isPolling, refresh: poll }
}
