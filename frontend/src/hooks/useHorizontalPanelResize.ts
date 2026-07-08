import { useCallback, useEffect, useRef, useState, type RefObject } from "react"

type UseHorizontalPanelResizeOptions = {
  defaultWidth: number
  minWidth: number
  maxWidthRatio?: number
}

export function useHorizontalPanelResize(
  containerRef: RefObject<HTMLElement | null>,
  {
    defaultWidth,
    minWidth,
    maxWidthRatio = 0.55,
  }: UseHorizontalPanelResizeOptions,
) {
  const [width, setWidth] = useState(defaultWidth)
  const draggingRef = useRef(false)

  const clampWidth = useCallback(
    (nextWidth: number) => {
      const container = containerRef.current
      const maxWidth = container
        ? Math.max(minWidth, container.clientWidth * maxWidthRatio)
        : defaultWidth * 2
      return Math.max(minWidth, Math.min(nextWidth, maxWidth))
    },
    [containerRef, defaultWidth, maxWidthRatio, minWidth],
  )

  const onResizePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    draggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!draggingRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setWidth(clampWidth(event.clientX - rect.left))
    }

    const handlePointerUp = () => {
      draggingRef.current = false
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
    }
  }, [clampWidth, containerRef])

  return {
    width,
    onResizePointerDown,
  }
}
