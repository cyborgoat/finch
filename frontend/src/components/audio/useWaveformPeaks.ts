import { useEffect, useState } from "react"
import {
  getCachedWaveformPeaks,
  loadWaveformPeaks,
} from "@/components/audio/waveform-peaks-cache"

type WaveformPeaksState = {
  key: string | null
  peaks: number[]
  isLoading: boolean
}

function buildWaveformPeaksState(
  src: string,
  pointCount: number,
): WaveformPeaksState {
  const disabled = !src || pointCount <= 0
  if (disabled) {
    return { key: null, peaks: [], isLoading: false }
  }

  const key = `${src}\0${pointCount}`
  const cached = getCachedWaveformPeaks(src, pointCount)
  return {
    key,
    peaks: cached ?? [],
    isLoading: cached === null,
  }
}

export function useWaveformPeaks(src: string, pointCount: number) {
  const [state, setState] = useState(() => buildWaveformPeaksState(src, pointCount))
  const nextState = buildWaveformPeaksState(src, pointCount)

  if (state.key !== nextState.key) {
    setState(nextState)
  }

  useEffect(() => {
    if (!nextState.key || !nextState.isLoading) return

    let cancelled = false

    void loadWaveformPeaks(src, pointCount)
      .then((loadedPeaks) => {
        if (!cancelled) {
          setState({
            key: nextState.key,
            peaks: loadedPeaks,
            isLoading: false,
          })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            key: nextState.key,
            peaks: [],
            isLoading: false,
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [nextState.isLoading, nextState.key, pointCount, src])

  return { peaks: state.peaks, isLoading: state.isLoading }
}
