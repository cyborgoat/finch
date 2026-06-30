
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type SpeakerConsentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending?: boolean
}

export function SpeakerConsentDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: SpeakerConsentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save speaker voiceprints locally?</DialogTitle>
          <DialogDescription className="space-y-2 pt-1">
            <span className="block">
              Finch can store voice embeddings on your machine to recognize speakers in
              future recordings. This data never leaves your computer.
            </span>
            <span className="block">
              You can delete individual profiles or wipe all voiceprint data anytime from
              Settings.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? "Saving…" : "I agree — save locally"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
