import { Card, CardContent } from "@/components/ui/card"

export default function DocumentDetailPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Document</h1>
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Document editing is coming in Milestone 9.
        </CardContent>
      </Card>
    </div>
  )
}
