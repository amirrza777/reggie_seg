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
};

function isLexicalJson(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return parsed !== null && typeof parsed === "object" && "root" in parsed;
  } catch {
    return false;
  }
}

export function RichTextViewer({ content }: RichTextViewerProps) {
  if (!content || !isLexicalJson(content)) {
    return <p>{content}</p>;
  }

  const initialConfig = {
    namespace: "RichTextViewer",
    nodes: [ListNode, ListItemNode, HeadingNode, QuoteNode, MentionNode],
    onError: console.error,
    editable: false,
    editorState: content,
    theme: RICH_EDITOR_THEME,
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
