import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AiActionPanel() {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-base">AI Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>Summarize, extract action items, and more — coming in Milestone 8.</p>
        <ul className="space-y-2">
          {[
            "Markdown Summary",
            "Action Items",
            "Meeting Notes",
            "Clean Transcript",
            "Study Notes",
          ].map((action) => (
            <li
              key={action}
              className="rounded-md border border-dashed border-border px-3 py-2 opacity-50"
            >
              {action}
            </li>
          ))}
        </ul>
        <p className="text-xs">
          ASR runs locally. AI actions will send transcript text to OpenRouter.
        </p>
      </CardContent>
    </Card>
  )
}
