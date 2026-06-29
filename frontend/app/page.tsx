"use client"

import Link from "next/link"
import { useDocuments } from "@/hooks/useDocuments"
import { useTranscripts } from "@/hooks/useTranscripts"
import { RecentDocumentList } from "@/components/documents/DocumentList"
import { RecentTranscriptList } from "@/components/transcripts/TranscriptList"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const { data: transcripts, isLoading: transcriptsLoading } = useTranscripts()
  const { data: documents, isLoading: documentsLoading } = useDocuments()

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Finch</h1>
        <p className="max-w-2xl text-muted-foreground">
          Local-first voice transcription. Record or upload audio, get an editable
          transcript, and generate Markdown documents with optional AI actions.
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
        {transcriptsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <RecentTranscriptList items={transcripts?.items ?? []} />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium">Recent documents</h2>
          <Link href="/documents" className="text-sm text-muted-foreground hover:underline">
            View all
          </Link>
        </div>
        {documentsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <RecentDocumentList items={documents?.items ?? []} />
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacy</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          ASR runs locally on your machine. AI document generation sends transcript
          text to OpenRouter only when you run an action.
        </CardContent>
      </Card>
    </div>
  )
}
