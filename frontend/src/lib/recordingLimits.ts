/** Matches backend `max_audio_duration_seconds` (2 hours). */
export const MAX_BROWSER_RECORDING_SECONDS = 7200

/** Show upload guidance after this many seconds of in-browser recording. */
export const WARN_BROWSER_RECORDING_SECONDS = 1800

export function shouldWarnLongRecording(durationSeconds: number) {
  return durationSeconds >= WARN_BROWSER_RECORDING_SECONDS
}
