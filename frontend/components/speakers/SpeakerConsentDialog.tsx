"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Save speaker voiceprints locally?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Finch can store voice embeddings on your machine to recognize speakers in
            future recordings. This data never leaves your computer.
          </p>
          <p>
            You can delete individual profiles or wipe all voiceprint data anytime from
            Settings.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={isPending}>
              {isPending ? "Saving…" : "I agree — save locally"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
