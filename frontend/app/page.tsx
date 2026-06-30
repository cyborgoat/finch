"use client"

import Link from "next/link"
import { useDocuments } from "@/hooks/useDocuments"
import { useTranscripts } from "@/hooks/useTranscripts"
import { RecentDocumentList } from "@/components/documents/DocumentList"
import { RecentTranscriptList } from "@/components/transcripts/TranscriptList"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { Section } from "@/components/layout/Section"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const { data: transcripts, isLoading: transcriptsLoading } = useTranscripts()
  const { data: documents, isLoading: documentsLoading } = useDocuments()

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Finch"
        description="Local-first voice transcription. Record or upload audio, get an editable transcript, and generate Markdown documents with optional AI actions."
        actions={
          <div className="flex flex-wrap gap-3">
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
        }
      />

      <Section title="Recent transcripts">
        {transcriptsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <RecentTranscriptList items={transcripts?.items ?? []} />
        )}
      </Section>

      <Section title="Recent documents">
        <div className="mb-3 flex justify-end">
          <Link href="/documents" className="text-sm text-muted-foreground hover:underline">
            View all documents
          </Link>
        </div>
        {documentsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <RecentDocumentList items={documents?.items ?? []} />
        )}
      </Section>

      <Card className="rounded-xl border bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Privacy</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          ASR runs locally on your machine. AI document generation sends transcript
          text to OpenRouter only when you run an action.
        </CardContent>
      </Card>
    </PageContainer>
  )
}
