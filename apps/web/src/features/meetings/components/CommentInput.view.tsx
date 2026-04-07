"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/shared/ui/Button";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, CLEAR_EDITOR_COMMAND, type EditorState, type LexicalEditor } from "lexical";
import { MentionNode } from "@/shared/ui/MentionNode";
import { MentionPlugin } from "@/shared/ui/MentionPlugin";

type Member = {
  id: number;
  firstName: string;
  lastName: string;
};

type CommentInputProps = {
  members: Member[];
  onPost: (text: string) => Promise<void>;
};

function EditorRefPlugin({ editorRef }: { editorRef: React.RefObject<LexicalEditor | null> }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editorRef.current = editor;
    return () => {
      if (editorRef.current === editor) {
        editorRef.current = null;
      }
    };
  }, [editor, editorRef]);

  return null;
}

export function CommentInput({ members, onPost }: CommentInputProps) {
  const [plainText, setPlainText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const editorRef = useRef<LexicalEditor | null>(null);

  const handleChange = useCallback((editorState: EditorState) => {
    editorState.read(() => {
      setPlainText($getRoot().getTextContent());
    });
  }, []);

  async function handlePost() {
    if (!plainText.trim()) {return;}
    setStatus("loading");
    try {
      await onPost(plainText.trim());
      setPlainText("");
      editorRef.current?.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
    } finally {
      setStatus("idle");
    }
  }

  const editorConfig = {
    namespace: "CommentEditor",
    nodes: [MentionNode],
    onError: console.error,
    theme: {},
  };

  return (
    <div className="stack">
      <span>Add a comment</span>
      <LexicalComposer initialConfig={editorConfig}>
        <div className="rich-editor">
          <div className="rich-editor__content">
            <PlainTextPlugin
              contentEditable={
                <ContentEditable
                  className="rich-editor__editable"
                  aria-placeholder="Add a comment or @mention someone..."
                  placeholder={
                    <div className="rich-editor__placeholder">
                      Add a comment or @mention someone...
                    </div>
                  }
                />
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>
          <OnChangePlugin onChange={handleChange} />
          <MentionPlugin members={members} />
          <ClearEditorPlugin />
          <EditorRefPlugin editorRef={editorRef} />
        </div>
      </LexicalComposer>
      <div>
        <Button type="button" onClick={handlePost} disabled={status === "loading" || !plainText.trim()}>
          {status === "loading" ? "Posting..." : "Post Comment"}
        </Button>
      </div>
    </div>
  );
}
