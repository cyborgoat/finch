export function shouldIgnoreKeyboardShortcut(event: KeyboardEvent): boolean {
  const target = event.target
  if (!(target instanceof HTMLElement)) return false

  if (target.isContentEditable) return true
  if (target.closest('[role="dialog"]')) return true

  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") {
    return true
  }

  if (tag === "A" && target.hasAttribute("href")) return true

  if (
    (event.key === "ArrowLeft" || event.key === "ArrowRight") &&
    target.getAttribute("role") === "slider"
  ) {
    return true
  }

  return false
}
