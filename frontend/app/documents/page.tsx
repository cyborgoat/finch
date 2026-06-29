"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { DocumentList } from "@/components/documents/DocumentList"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useDeleteDocument, useDocuments } from "@/hooks/useDocuments"

export default function DocumentsPage() {
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
    if (!confirm("Delete this document?")) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Document deleted")
    } catch {
      toast.error("Failed to delete document")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Documents</h1>
        <p className="text-sm text-muted-foreground">
          AI-generated Markdown from your transcripts.
        </p>
      </div>

      <Input
        placeholder="Search by title…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <DocumentList items={items} onDelete={(id) => void handleDelete(id)} />
      )}
    </div>
  )
}
