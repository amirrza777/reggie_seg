"use client";

import { useEffect, useRef } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND, UNDO_COMMAND, REDO_COMMAND, INDENT_CONTENT_COMMAND, OUTDENT_CONTENT_COMMAND, $getSelection, $isRangeSelection, type EditorState } from "lexical";
import { ListNode, ListItemNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from "@lexical/list";
import { HeadingNode, $createHeadingNode, QuoteNode, $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";

type ToolbarButton = {
  label: string;
  action: (editor: ReturnType<typeof useLexicalComposerContext>[0]) => void;
};

const TOOLBAR_GROUPS: ToolbarButton[][] = [
  [
    { label: "↩", action: (ed) => ed.dispatchCommand(UNDO_COMMAND, undefined) },
    { label: "↪", action: (ed) => ed.dispatchCommand(REDO_COMMAND, undefined) },
  ],
  [
    { label: "H1", action: (ed) => ed.update(() => { const s = $getSelection(); if ($isRangeSelection(s)) $setBlocksType(s, () => $createHeadingNode("h1")); }) },
    { label: "H2", action: (ed) => ed.update(() => { const s = $getSelection(); if ($isRangeSelection(s)) $setBlocksType(s, () => $createHeadingNode("h2")); }) },
    { label: "H3", action: (ed) => ed.update(() => { const s = $getSelection(); if ($isRangeSelection(s)) $setBlocksType(s, () => $createHeadingNode("h3")); }) },
  ],
  [
    { label: "B", action: (ed) => ed.dispatchCommand(FORMAT_TEXT_COMMAND, "bold") },
    { label: "I", action: (ed) => ed.dispatchCommand(FORMAT_TEXT_COMMAND, "italic") },
    { label: "U", action: (ed) => ed.dispatchCommand(FORMAT_TEXT_COMMAND, "underline") },
    { label: "S", action: (ed) => ed.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough") },
    { label: "x²", action: (ed) => ed.dispatchCommand(FORMAT_TEXT_COMMAND, "superscript") },
    { label: "x₂", action: (ed) => ed.dispatchCommand(FORMAT_TEXT_COMMAND, "subscript") },
    { label: "<>", action: (ed) => ed.dispatchCommand(FORMAT_TEXT_COMMAND, "code") },
  ],
  [
    { label: "•", action: (ed) => ed.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined) },
    { label: "1.", action: (ed) => ed.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined) },
    { label: '"', action: (ed) => ed.update(() => { const s = $getSelection(); if ($isRangeSelection(s)) $setBlocksType(s, () => $createQuoteNode()); }) },
  ],
  [
    { label: "≡←", action: (ed) => ed.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left") },
    { label: "≡", action: (ed) => ed.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center") },
    { label: "≡→", action: (ed) => ed.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right") },
    { label: "☰", action: (ed) => ed.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify") },
  ],
  [
    { label: "⇤", action: (ed) => ed.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined) },
    { label: "⇥", action: (ed) => ed.dispatchCommand(INDENT_CONTENT_COMMAND, undefined) },
  ],
];

function Toolbar() {
  const [editor] = useLexicalComposerContext();

  return (
    <div className="minutes-editor__toolbar">
      {TOOLBAR_GROUPS.map((group, i) => (
        <span key={i} className="minutes-editor__group">
          {group.map(({ label, action }) => (
            <button
              key={label}
              type="button"
              className="minutes-editor__tool"
              onMouseDown={(e) => { e.preventDefault(); action(editor); }}
            >
              {label}
            </button>
          ))}
        </span>
      ))}
    </div>
  );
}

function InitialContentPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();
  const initialContent = useRef(content);

  useEffect(() => {
    if (!initialContent.current) return;
    try {
      editor.setEditorState(editor.parseEditorState(initialContent.current));
    } catch {
      // saved content isn't valid Lexical JSON — start empty
    }
  }, [editor]);

  return null;
}

type MinutesEditorProps = {
  initialContent: string;
  onChange: (json: string) => void;
};

export function MinutesEditor({ initialContent, onChange }: MinutesEditorProps) {
  const initialConfig = {
    namespace: "MeetingMinutes",
    nodes: [ListNode, ListItemNode, HeadingNode, QuoteNode],
    onError: console.error,
    theme: {
      text: {
        bold: "minutes-editor__bold",
        italic: "minutes-editor__italic",
        underline: "minutes-editor__underline",
        strikethrough: "minutes-editor__strikethrough",
        superscript: "minutes-editor__superscript",
        subscript: "minutes-editor__subscript",
        code: "minutes-editor__code",
      },
      heading: {
        h1: "minutes-editor__h1",
        h2: "minutes-editor__h2",
        h3: "minutes-editor__h3",
      },
      quote: "minutes-editor__quote",
      list: {
        ul: "minutes-editor__ul",
        ol: "minutes-editor__ol",
        listitem: "minutes-editor__listitem",
      },
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="minutes-editor">
        <Toolbar />
        <div className="minutes-editor__content">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="minutes-editor__editable"
                aria-placeholder="Capture decisions, risks, and action items..."
                placeholder={
                  <div className="minutes-editor__placeholder">
                    Capture decisions, risks, and action items...
                  </div>
                }
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <OnChangePlugin onChange={(state: EditorState) => onChange(JSON.stringify(state.toJSON()))} />
        <InitialContentPlugin content={initialContent} />
      </div>
    </LexicalComposer>
  );
}
