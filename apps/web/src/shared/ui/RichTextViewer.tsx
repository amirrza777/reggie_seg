"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { ListNode, ListItemNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";

type RichTextViewerProps = {
  content: string;
};

export function RichTextViewer({ content }: RichTextViewerProps) {
  const initialConfig = {
    namespace: "RichTextViewer",
    nodes: [ListNode, ListItemNode, HeadingNode, QuoteNode],
    onError: console.error,
    editable: false,
    editorState: content,
    theme: {
      text: {
        bold: "rich-editor__bold",
        italic: "rich-editor__italic",
        underline: "rich-editor__underline",
        strikethrough: "rich-editor__strikethrough",
        superscript: "rich-editor__superscript",
        subscript: "rich-editor__subscript",
        code: "rich-editor__code",
      },
      heading: {
        h1: "rich-editor__h1",
        h2: "rich-editor__h2",
        h3: "rich-editor__h3",
      },
      quote: "rich-editor__quote",
      list: {
        ul: "rich-editor__ul",
        ol: "rich-editor__ol",
        listitem: "rich-editor__listitem",
        nested: { listitem: "rich-editor__nested-listitem" },
      },
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable className="rich-editor__editable rich-editor__editable--readonly" />}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <ListPlugin />
    </LexicalComposer>
  );
}
