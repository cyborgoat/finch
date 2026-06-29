"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DocumentEditor } from "@/components/documents/DocumentEditor"
import { DocumentToolbar } from "@/components/documents/DocumentToolbar"
import { MarkdownPreview } from "@/components/documents/MarkdownPreview"
import { Skeleton } from "@/components/ui/skeleton"
import { useDeleteDocument, useDocument, useUpdateDocument } from "@/hooks/useDocuments"
import { exportDocumentMd } from "@/lib/export"
import type { Document } from "@/lib/types"

function DocumentDetailEditor({ document }: { document: Document }) {
  const router = useRouter()
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
    if (!confirm("Delete this document?")) return
    try {
      await deleteMutation.mutateAsync(document.id)
      toast.success("Document deleted")
      router.push("/documents")
    } catch {
      toast.error("Failed to delete")
    }
  }

  return (
    <div className="space-y-6">
      <DocumentToolbar
        onSave={() => void handleSave()}
        onCopy={() => void handleCopy()}
        onExport={() => exportDocumentMd(title, markdown)}
        onDelete={() => void handleDelete()}
        isSaving={updateMutation.isPending}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DocumentEditor
          title={title}
          markdown={markdown}
          onTitleChange={setTitle}
          onMarkdownChange={setMarkdown}
          disabled={updateMutation.isPending}
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">Preview</p>
          <MarkdownPreview markdown={markdown} />
        </div>
      </div>
    </div>
  )
}

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: document, isLoading } = useDocument(id)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!document) {
    return <p className="text-muted-foreground">Document not found.</p>
  }

  return (
    <DocumentDetailEditor
      key={`${document.id}-${document.updatedAt}`}
      document={document}
    />
  )
}
