import { useEffect } from "react"
import { shouldIgnoreKeyboardShortcut } from "@/lib/keyboardShortcuts"

type UseRecordingDetailKeyboardShortcutsOptions = {
  enabled?: boolean
  onTogglePlay: () => void
  onSkipBackward: () => void
  onSkipForward: () => void
}

export function useRecordingDetailKeyboardShortcuts({
  enabled = true,
  onTogglePlay,
  onSkipBackward,
  onSkipForward,
}: UseRecordingDetailKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreKeyboardShortcut(event)) return

      if (event.key === " " || event.code === "Space") {
        event.preventDefault()
        onTogglePlay()
        return
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault()
        onSkipBackward()
        return
      }

      if (event.key === "ArrowRight") {
        event.preventDefault()
        onSkipForward()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [enabled, onTogglePlay, onSkipBackward, onSkipForward])
}
