function sanitizeFilename(title: string): string {
  return title
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase() || "untitled"
}

function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportTranscriptTxt(title: string, text: string) {
  const content = `${title}\n\n${text}`
  downloadText(
    `finch-transcript-${sanitizeFilename(title)}.txt`,
    content,
    "text/plain;charset=utf-8",
  )
}

export function exportNoteMd(title: string, markdown: string) {
  downloadText(
    `finch-document-${sanitizeFilename(title)}.md`,
    markdown,
    "text/markdown;charset=utf-8",
  )
}
