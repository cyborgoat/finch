"use client"

import type { ReactNode } from "react"

type MarkdownPreviewProps = {
  markdown: string
}

function renderInline(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  const lines = markdown.split("\n")
  const elements: ReactNode[] = []

  lines.forEach((line, index) => {
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={index} className="mb-3 text-2xl font-semibold">
          {line.slice(2)}
        </h1>,
      )
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={index} className="mb-2 mt-4 text-lg font-medium">
          {line.slice(3)}
        </h2>,
      )
    } else if (line.startsWith("- [ ] ")) {
      elements.push(
        <p key={index} className="text-sm leading-relaxed">
          ☐ {line.slice(6)}
        </p>,
      )
    } else if (line.startsWith("- [x] ") || line.startsWith("- [X] ")) {
      elements.push(
        <p key={index} className="text-sm leading-relaxed">
          ☑ {line.slice(6)}
        </p>,
      )
    } else if (line.startsWith("- ")) {
      elements.push(
        <p
          key={index}
          className="text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: `• ${renderInline(line.slice(2))}` }}
        />,
      )
    } else if (line.trim() === "") {
      elements.push(<div key={index} className="h-2" />)
    } else {
      elements.push(
        <p
          key={index}
          className="text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderInline(line) }}
        />,
      )
    }
  })

  return (
    <div className="min-h-[480px] rounded-lg border border-border bg-muted/20 p-4">
      {elements.length > 0 ? elements : (
        <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
      )}
    </div>
  )
}
