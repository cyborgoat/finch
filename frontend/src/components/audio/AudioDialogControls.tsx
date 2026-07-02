import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function AudioDialogFooter({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function AudioPrimaryIconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex">
            <Button
              type="button"
              size="icon-lg"
              onClick={onClick}
              disabled={disabled}
              aria-label={label}
              className="size-14 rounded-full shadow-sm"
            >
              {children}
            </Button>
          </span>
        }
      />
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

export function AudioSecondaryIconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onClick}
              disabled={disabled}
              aria-label={label}
              className="size-10 rounded-full"
            >
              {children}
            </Button>
          </span>
        }
      />
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}
