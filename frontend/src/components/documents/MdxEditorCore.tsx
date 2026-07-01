import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  ChangeCodeMirrorLanguage,
  codeBlockPlugin,
  codeMirrorPlugin,
  CodeToggle,
  ConditionalContents,
  CreateLink,
  headingsPlugin,
  imagePlugin,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  quotePlugin,
  Separator,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
  type MDXEditorMethods,
} from "@mdxeditor/editor"
import { forwardRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

import "@mdxeditor/editor/style.css"

const CODE_BLOCK_LANGUAGES = {
  text: "Plain text",
  markdown: "Markdown",
  js: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript (React)",
  python: "Python",
  bash: "Bash",
  json: "JSON",
} as const

function NoteEditorToolbar() {
  return (
    <ConditionalContents
      options={[
        {
          when: (editor) => editor?.editorType === "codeblock",
          contents: () => <ChangeCodeMirrorLanguage />,
        },
        {
          fallback: () => (
            <>
              <UndoRedo />
              <Separator />
              <BlockTypeSelect />
              <Separator />
              <BoldItalicUnderlineToggles />
              <CodeToggle />
              <Separator />
              <ListsToggle />
              <Separator />
              <CreateLink />
              <InsertImage />
              <InsertTable />
              <InsertCodeBlock />
              <InsertThematicBreak />
            </>
          ),
        },
      ]}
    />
  )
}

function useDocumentDarkMode() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const sync = () => setIsDark(root.classList.contains("dark"))
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return isDark
}

const InitializedMDXEditor = forwardRef<MDXEditorMethods, React.ComponentProps<typeof MDXEditor>>(
  (props, ref) => {
    const isDark = useDocumentDarkMode()

    return (
      <MDXEditor
        {...props}
        ref={ref}
        className={cn("mdx-note-mdxeditor", isDark && "dark-theme", props.className)}
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          tablePlugin(),
          imagePlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: "text" }),
          codeMirrorPlugin({ codeBlockLanguages: CODE_BLOCK_LANGUAGES }),
          markdownShortcutPlugin(),
          toolbarPlugin({
            toolbarClassName: "mdxeditor-toolbar mdx-note-toolbar",
            toolbarContents: () => <NoteEditorToolbar />,
          }),
        ]}
      />
    )
  },
)

InitializedMDXEditor.displayName = "InitializedMDXEditor"

export { InitializedMDXEditor }
