import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

export type TopbarActions = {
  audioAssetId: string
  audioFilename?: string
  title: string
  transcriptText: string
  onRename: (title: string) => void | Promise<void>
  onDelete: () => void
  isRenaming?: boolean
  isDeleting?: boolean
}

type TopbarActionsContextValue = {
  actions: TopbarActions | null
  setActions: (actions: TopbarActions | null) => void
}

const TopbarActionsContext = createContext<TopbarActionsContextValue | null>(null)

export function TopbarActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = useState<TopbarActions | null>(null)
  const value = useMemo(() => ({ actions, setActions }), [actions])

  return (
    <TopbarActionsContext.Provider value={value}>
      {children}
    </TopbarActionsContext.Provider>
  )
}

export function useTopbarActions() {
  const context = useContext(TopbarActionsContext)
  if (!context) {
    throw new Error("useTopbarActions must be used within TopbarActionsProvider")
  }
  return context
}

export function useRegisterTopbarActions(
  actions: TopbarActions | null,
  deps: React.DependencyList,
) {
  const { setActions } = useTopbarActions()

  useEffect(() => {
    setActions(actions)
    return () => setActions(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies deps
  }, deps)
}
