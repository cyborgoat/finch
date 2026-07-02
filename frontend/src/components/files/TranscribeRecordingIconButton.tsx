import { RefreshCw, SquareChartGantt } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type TranscribeRecordingIconButtonProps = {
  action: "transcribe" | "retry"
  tooltip: string
  ariaLabel: string
  disabled?: boolean
  onClick: () => void
}

export function TranscribeRecordingIconButton({
  action,
  tooltip,
  ariaLabel,
  disabled,
  onClick,
}: TranscribeRecordingIconButtonProps) {
  const Icon = action === "retry" ? RefreshCw : SquareChartGantt

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              onClick={onClick}
              aria-label={ariaLabel}
              className="text-muted-foreground hover:text-foreground"
            >
              <Icon className="size-4" />
            </Button>
          </span>
        }
      />
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  )
}
