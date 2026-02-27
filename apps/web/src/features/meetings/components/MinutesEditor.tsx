"use client";

import { useEffect } from "react";
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

function Toolbar() {
  const [editor] = useLexicalComposerContext();

  return (
    <div className="minutes-editor__toolbar">
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(UNDO_COMMAND, undefined); }}
      >
        ↩
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(REDO_COMMAND, undefined); }}
      >
        ↪
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.update(() => { const s = $getSelection(); if ($isRangeSelection(s)) $setBlocksType(s, () => $createHeadingNode("h1")); }); }}
      >
        H1
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.update(() => { const s = $getSelection(); if ($isRangeSelection(s)) $setBlocksType(s, () => $createHeadingNode("h2")); }); }}
      >
        H2
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.update(() => { const s = $getSelection(); if ($isRangeSelection(s)) $setBlocksType(s, () => $createHeadingNode("h3")); }); }}
      >
        H3
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold"); }}
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic"); }}
      >
        <em>I</em>
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline"); }}
      >
        <span style={{ textDecoration: "underline" }}>U</span>
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough"); }}
      >
        <span style={{ textDecoration: "line-through" }}>S</span>
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined); }}
      >
        •
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined); }}
      >
        1.
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.update(() => { const s = $getSelection(); if ($isRangeSelection(s)) $setBlocksType(s, () => $createQuoteNode()); }); }}
      >
        "
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(FORMAT_TEXT_COMMAND, "superscript"); }}
      >
        x²
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(FORMAT_TEXT_COMMAND, "subscript"); }}
      >
        x₂
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code"); }}
      >
        {"<>"}
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left"); }}
      >
        ≡←
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center"); }}
      >
        ≡
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right"); }}
      >
        ≡→
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify"); }}
      >
        ☰
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined); }}
      >
        ⇤
      </button>
      <button
        type="button"
        className="minutes-editor__tool"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined); }}
      >
        ⇥
      </button>
    </div>
  );
}

function InitialContentPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!content) return;
    try {
      editor.setEditorState(editor.parseEditorState(content));
    } catch {
      // content is not valid Lexical JSON — start empty
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
