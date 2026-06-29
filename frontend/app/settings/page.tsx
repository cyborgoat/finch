"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getHealth } from "@/lib/api"

export default function SettingsPage() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Local configuration and privacy information.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backend status</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm">
          {isLoading ? (
            <span className="text-muted-foreground">Checking…</span>
          ) : isError ? (
            <Badge variant="destructive">Offline</Badge>
          ) : (
            <>
              <Badge variant="default">Online</Badge>
              <span className="text-muted-foreground">{data?.app}</span>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ASR model</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {data?.capabilities ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={data.capabilities.asrMock ? "secondary" : "default"}>
                {data.capabilities.asrMock ? "Mock mode" : "Real transcription"}
              </Badge>
            </div>
          ) : null}
          <p>
            Transcription runs locally with Qwen3-ASR-1.7B. Configure in backend{" "}
            <code className="text-xs">.env</code> (ASR_MODEL_ID, ASR_MOCK=false for real ASR).
            Check the backend terminal on startup for dependency and configuration details.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Speaker diarization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {data?.capabilities ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    data.capabilities.diarizationReady ? "default" : "secondary"
                  }
                >
                  {data.capabilities.diarizationReady
                    ? "Ready for speaker labels"
                    : "Not configured"}
                </Badge>
                {data.capabilities.diarizationEnabled && (
                  <Badge variant="outline">Enabled</Badge>
                )}
              </div>
              {data.capabilities.diarizationReason && (
                <p className="text-amber-700 dark:text-amber-400">
                  {data.capabilities.diarizationReason}
                </p>
              )}
            </>
          ) : null}
          <p>
            Transcripts show <code className="text-xs">Speaker 1: …</code>,{" "}
            <code className="text-xs">Speaker 2: …</code> when diarization runs.
            Set <code className="text-xs">HF_TOKEN</code> in{" "}
            <code className="text-xs">.env</code> or run{" "}
            <code className="text-xs">huggingface-cli login</code>, then re-transcribe.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">OpenRouter / LLM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {data?.capabilities ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={data.capabilities.llmMock ? "secondary" : "default"}>
                {data.capabilities.llmMock ? "Mock mode" : "OpenRouter"}
              </Badge>
              {!data.capabilities.llmMock && (
                <Badge
                  variant={
                    data.capabilities.openrouterConfigured ? "default" : "destructive"
                  }
                >
                  {data.capabilities.openrouterConfigured
                    ? "API key configured"
                    : "API key missing"}
                </Badge>
              )}
            </div>
          ) : null}
          <p>
            AI actions use OpenRouter. Set <code className="text-xs">OPENROUTER_API_KEY</code>{" "}
            in backend <code className="text-xs">.env</code>. Use{" "}
            <code className="text-xs">LLM_MOCK=true</code> for development without API calls.
          </p>
          <p>Only transcript text is sent to the LLM—not audio.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacy</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Audio stays on your machine for transcription and optional diarization.
          LLM features are optional and only process text you explicitly send via AI
          actions.
        </CardContent>
      </Card>
    </div>
  )
}
