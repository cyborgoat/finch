import { createFileRoute } from "@tanstack/react-router"
import { RecentRecordingList } from "@/components/files/RecentFileList"
import { PageContainer } from "@/components/layout/PageContainer"
import { Skeleton } from "@/components/ui/skeleton"
import { useRecordingListActions } from "@/hooks/useRecordingListActions"
import { useRecentRecordings } from "@/hooks/useRecordings"
import { recordingsListQuery } from "@/lib/queries/recordingsList"

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(recordingsListQuery()),
  component: HomePage,
})

function HomePage() {
  const { data: items, isLoading } = useRecentRecordings(8)
  const {
    handleRename,
    handleDelete,
    handleTranscribe,
    isRenaming,
    isDeleting,
    isTranscribing,
  } = useRecordingListActions()

  return (
    <PageContainer size="wide">
      {isLoading ? (
        <Skeleton className="h-56 w-full rounded-xl" />
      ) : (
        <RecentRecordingList
          items={items ?? []}
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
