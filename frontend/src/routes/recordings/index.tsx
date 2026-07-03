import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { RecordingBrowser } from "@/components/files/FileBrowser"
import { PageContainer } from "@/components/layout/PageContainer"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useRecordingListActions } from "@/hooks/useRecordingListActions"
import { useRecordingsList } from "@/hooks/useRecordings"
import { recordingsListQuery } from "@/lib/queries/recordingsList"

export const Route = createFileRoute("/recordings/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(recordingsListQuery()),
  component: FilesPage,
})

function FilesPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useRecordingsList()
  const {
    handleRename,
    handleDelete,
    handleTranscribe,
    isRenaming,
    isDeleting,
    isTranscribing,
  } = useRecordingListActions()
  const [query, setQuery] = useState("")

  const items = useMemo(() => data?.items ?? [], [data?.items])

  return (
    <PageContainer size="wide">
      <div className="mb-6 flex justify-end">
        <Input
          placeholder={t("common.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full min-w-[200px] max-w-xs"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : (
        <RecordingBrowser
          items={items}
          query={query}
          onRename={(id, title) => void handleRename(id, title)}
          onDelete={(id) => void handleDelete(id)}
          onTranscribe={(id, options) => void handleTranscribe(id, options)}
          isRenaming={isRenaming}
          isDeleting={isDeleting}
          isTranscribing={isTranscribing}
        />
      )}
    </PageContainer>
  )
}
