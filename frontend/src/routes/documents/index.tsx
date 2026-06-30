import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { DocumentTable } from "@/components/documents/DocumentTable"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useDeleteDocument, useDocuments } from "@/hooks/useDocuments"
import { documentsQuery } from "@/lib/queries/documents"

export const Route = createFileRoute("/documents/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(documentsQuery()),
  component: DocumentsPage,
})

function DocumentsPage() {
  const { data, isLoading } = useDocuments()
  const deleteMutation = useDeleteDocument()
  const [query, setQuery] = useState("")

  const items = useMemo(() => {
    const all = data?.items ?? []
    if (!query.trim()) return all
    const q = query.toLowerCase()
    return all.filter((item) => item.title.toLowerCase().includes(q))
  }, [data?.items, query])

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Document deleted")
    } catch {
      toast.error("Failed to delete document")
    }
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Documents"
        description="AI-generated Markdown from your transcripts."
        actions={
          <Input
            placeholder="Search by title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full min-w-[200px] max-w-xs"
          />
        }
      />

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : (
        <DocumentTable
          items={items}
          onDelete={(id) => void handleDelete(id)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </PageContainer>
  )
}
