"use client"

import Link from "next/link"
import { useTranscripts } from "@/hooks/useTranscripts"
import { RecentTranscriptList } from "@/components/transcripts/TranscriptList"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const { data, isLoading } = useTranscripts()

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Finch</h1>
        <p className="max-w-2xl text-muted-foreground">
          Local-first voice transcription. Record or upload audio, get an editable
          transcript, and optionally generate Markdown later.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/record" className={cn(buttonVariants())}>
            Record voice
          </Link>
          <Link
            href="/upload"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Upload audio
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recent transcripts</h2>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <RecentTranscriptList items={data?.items ?? []} />
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          AI-generated Markdown documents are coming in Milestone 8–9.
        </CardContent>
      </Card>
    </div>
  )
}
