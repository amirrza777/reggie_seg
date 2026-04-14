"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { ListNode, ListItemNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { MentionNode } from "./MentionNode";
import { RICH_EDITOR_THEME } from "./RichTextEditor";

type RichTextViewerProps = {
  content: string;
  noPadding?: boolean;
};

function isLexicalJson(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return parsed !== null && typeof parsed === "object" && "root" in parsed;
  } catch {
    return false;
  }
}

export function RichTextViewer({ content, noPadding = false }: RichTextViewerProps) {
  if (!content || !isLexicalJson(content)) {
    const plainClassName = noPadding ? "rich-editor__plain rich-editor__plain--no-padding" : "rich-editor__plain";
    return <p className={plainClassName}>{content}</p>;
  }

  const initialConfig = {
    namespace: "RichTextViewer",
    nodes: [ListNode, ListItemNode, HeadingNode, QuoteNode, MentionNode],
    onError: console.error,
    editable: false,
    editorState: content,
    theme: RICH_EDITOR_THEME,
  };
  const viewerKey = `${noPadding ? "np" : "p"}:${content}`;

  return (
    <LexicalComposer key={viewerKey} initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            className={`rich-editor__editable rich-editor__editable--readonly${noPadding ? " rich-editor__editable--no-padding" : ""}`}
          />
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      <ListPlugin />
    </LexicalComposer>
  );
}
