
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type DocumentEditorProps = {
  title: string
  markdown: string
  onTitleChange: (value: string) => void
  onMarkdownChange: (value: string) => void
  disabled?: boolean
}

export function DocumentEditor({
  title,
  markdown,
  onTitleChange,
  onMarkdownChange,
  disabled,
}: DocumentEditorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="document-title">
          Title
        </label>
        <Input
          id="document-title"
          value={title}
          disabled={disabled}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="document-markdown">
          Markdown
        </label>
        <Textarea
          id="document-markdown"
          value={markdown}
          disabled={disabled}
          onChange={(e) => onMarkdownChange(e.target.value)}
          className="min-h-[480px] resize-y font-mono text-sm leading-relaxed"
        />
      </div>
    </div>
  )
}
