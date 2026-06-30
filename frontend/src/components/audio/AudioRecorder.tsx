
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AudioPreview } from "@/components/audio/AudioPreview"
import { AudioWaveform } from "@/components/audio/AudioWaveform"
import type { RecorderState } from "@/hooks/useAudioRecorder"

type AudioRecorderProps = {
  state: RecorderState
  durationSeconds: number
  audioUrl: string | null
  audioBlob: Blob | null
  mediaStream: MediaStream | null
  error: string | null
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onReset: () => void
}

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export function AudioRecorder({
  state,
  durationSeconds,
  audioUrl,
  audioBlob,
  mediaStream,
  error,
  onStart,
  onPause,
  onResume,
  onStop,
  onReset,
}: AudioRecorderProps) {
  const isRecording = state === "recording"
  const isPaused = state === "paused"
  const hasRecording = state === "stopped" && !!audioUrl

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Record voice</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-2xl tabular-nums">
            {formatTimer(durationSeconds)}
          </span>
          <span className="text-sm capitalize text-muted-foreground">{state}</span>
        </div>
        <AudioWaveform
          state={state}
          stream={mediaStream}
          audioBlob={audioBlob}
        />
        <div className="flex flex-wrap gap-2">
          {state === "idle" || state === "error" ? (
            <Button onClick={onStart}>Start recording</Button>
          ) : null}
          {isRecording ? (
            <>
              <Button variant="outline" onClick={onPause}>
                Pause
              </Button>
              <Button onClick={onStop}>Stop</Button>
            </>
          ) : null}
          {isPaused ? (
            <>
              <Button onClick={onResume}>Resume</Button>
              <Button onClick={onStop}>Stop</Button>
            </>
          ) : null}
          {hasRecording || state === "error" ? (
            <Button variant="ghost" onClick={onReset}>
              Reset
            </Button>
          ) : null}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {hasRecording && <AudioPreview audioUrl={audioUrl} />}
      </CardContent>
    </Card>
  )
}
