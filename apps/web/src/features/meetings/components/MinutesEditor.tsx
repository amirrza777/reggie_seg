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
import { FORMAT_TEXT_COMMAND, type EditorState } from "lexical";
import { ListNode, ListItemNode, INSERT_UNORDERED_LIST_COMMAND } from "@lexical/list";

function Toolbar() {
  const [editor] = useLexicalComposerContext();

  return (
    <div className="minutes-editor__toolbar">
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
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined); }}
      >
        •
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
    nodes: [ListNode, ListItemNode],
    onError: console.error,
    theme: {
      text: {
        bold: "minutes-editor__bold",
        italic: "minutes-editor__italic",
        underline: "minutes-editor__underline",
      },
      list: {
        ul: "minutes-editor__ul",
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
