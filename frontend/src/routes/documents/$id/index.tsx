import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { DocumentEditor } from "@/components/documents/DocumentEditor"
import { DocumentToolbar } from "@/components/documents/DocumentToolbar"
import { MarkdownPreview } from "@/components/documents/MarkdownPreview"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { Section } from "@/components/layout/Section"
import { BlurFade } from "@/components/motion-primitives/blur-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useDeleteDocument,
  useDocument,
  useUpdateDocument,
} from "@/hooks/useDocuments"
import { exportDocumentMd } from "@/lib/export"
import { documentQuery } from "@/lib/queries/documents"
import type { Document } from "@/lib/types"

export const Route = createFileRoute("/documents/$id/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(documentQuery(params.id)),
  component: DocumentDetailPage,
})

function DocumentDetailEditor({ document }: { document: Document }) {
  const navigate = useNavigate()
  const updateMutation = useUpdateDocument(document.id)
  const deleteMutation = useDeleteDocument()

  const [title, setTitle] = useState(document.title)
  const [markdown, setMarkdown] = useState(document.markdown)

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ title, markdown })
      toast.success("Document saved")
    } catch {
      toast.error("Failed to save")
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown)
    toast.success("Copied to clipboard")
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(document.id)
      toast.success("Document deleted")
      void navigate({ to: "/documents" })
    } catch {
      toast.error("Failed to delete")
    }
  }

  return (
    <BlurFade className="section-stack">
      <PageHeader
        backHref="/documents"
        backLabel="Documents"
        title={title || "Untitled document"}
        description="Edit Markdown or preview the rendered output."
        meta={`Updated ${new Date(document.updatedAt).toLocaleString()}`}
      />

      <DocumentToolbar
        onSave={() => void handleSave()}
        onCopy={() => void handleCopy()}
        onExport={() => exportDocumentMd(title, markdown)}
        onDelete={() => void handleDelete()}
        isSaving={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
      />

      <div className="hidden gap-6 lg:grid lg:grid-cols-2">
        <DocumentEditor
          title={title}
          markdown={markdown}
          onTitleChange={setTitle}
          onMarkdownChange={setMarkdown}
          disabled={updateMutation.isPending}
        />
        <Section title="Preview">
          <MarkdownPreview markdown={markdown} />
        </Section>
      </div>

      <Tabs defaultValue="edit" className="lg:hidden">
        <TabsList variant="line" className="w-full justify-start border-b border-border pb-0">
          <TabsTrigger value="edit" className="px-4 pb-3">
            Edit
          </TabsTrigger>
          <TabsTrigger value="preview" className="px-4 pb-3">
            Preview
          </TabsTrigger>
        </TabsList>
        <TabsContent value="edit" className="mt-4">
          <DocumentEditor
            title={title}
            markdown={markdown}
            onTitleChange={setTitle}
            onMarkdownChange={setMarkdown}
            disabled={updateMutation.isPending}
          />
        </TabsContent>
        <TabsContent value="preview" className="mt-4">
          <MarkdownPreview markdown={markdown} />
        </TabsContent>
      </Tabs>
    </BlurFade>
  )
}

function DocumentDetailPage() {
  const { id } = Route.useParams()
  const { data: document, isLoading } = useDocument(id)

  if (isLoading) {
    return (
      <PageContainer size="detail">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-8 h-96 w-full" />
      </PageContainer>
    )
  }

  if (!document) {
    return (
      <PageContainer size="detail">
        <p className="text-muted-foreground">Document not found.</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer size="detail">
      <DocumentDetailEditor
        key={`${document.id}-${document.updatedAt}`}
        document={document}
      />
    </PageContainer>
  )
}
