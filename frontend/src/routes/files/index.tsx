import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { FileBrowser } from "@/components/files/FileBrowser"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useFiles } from "@/hooks/useFiles"
import {
  useDeleteTranscript,
  useRenameTranscript,
} from "@/hooks/useTranscripts"
import { filesQuery } from "@/lib/queries/files"

export const Route = createFileRoute("/files/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(filesQuery()),
  component: FilesPage,
})

function FilesPage() {
  const { data, isLoading } = useFiles()
  const deleteTranscriptMutation = useDeleteTranscript()
  const renameMutation = useRenameTranscript()
  const [query, setQuery] = useState("")

  const items = useMemo(() => data?.items ?? [], [data?.items])

  const handleRename = async (id: string, title: string) => {
    try {
      await renameMutation.mutateAsync({ id, title })
      toast.success("File renamed")
    } catch {
      toast.error("Failed to rename file")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTranscriptMutation.mutateAsync(id)
      toast.success("File deleted")
    } catch {
      toast.error("Failed to delete file")
    }
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Files"
        description="Voice recordings. Open a file to view its transcript and AI-generated documents."
        actions={
          <Input
            placeholder="Search by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full min-w-[200px] max-w-xs"
          />
        }
      />

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : (
        <FileBrowser
          items={items}
          query={query}
          onRename={(id, title) => void handleRename(id, title)}
          onDelete={(id) => void handleDelete(id)}
          isRenaming={renameMutation.isPending}
          isDeleting={deleteTranscriptMutation.isPending}
        />
      )}
    </PageContainer>
  )
}
