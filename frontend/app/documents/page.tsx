import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Documents</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          AI-generated Markdown documents will appear here in Milestone 9 after
          OpenRouter integration (Milestone 8).
        </CardContent>
      </Card>
    </div>
  )
}
