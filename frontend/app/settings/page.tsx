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
        <CardContent className="text-sm text-muted-foreground">
          Transcription runs locally with Qwen3-ASR-1.7B. Configure the model in
          backend <code className="text-xs">.env</code> (ASR_MODEL_ID, ASR_MOCK).
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacy</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          ASR transcription runs locally. Audio files are not sent to external
          services. When AI actions are enabled, only selected transcript text will
          be sent to your configured LLM provider through OpenRouter—not audio.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">OpenRouter</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          API key is configured in backend <code className="text-xs">.env</code>{" "}
          only. LLM features are not available yet (Milestone 8).
        </CardContent>
      </Card>
    </div>
  )
}
