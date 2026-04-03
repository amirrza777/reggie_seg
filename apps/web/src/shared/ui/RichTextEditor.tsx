"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { $rootTextContent } from "@lexical/text";
import { Undo2, Redo2, Heading1, Heading2, Heading3, Bold, Italic, Underline, Strikethrough, Superscript, Subscript, Code, List, ListOrdered, Quote, AlignLeft, AlignCenter, AlignRight, AlignJustify, Outdent, Indent } from "lucide-react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND, UNDO_COMMAND, REDO_COMMAND, INDENT_CONTENT_COMMAND, OUTDENT_CONTENT_COMMAND, $getSelection, $isRangeSelection, $getRoot, type EditorState } from "lexical";
import { ListNode, ListItemNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from "@lexical/list";
import { HeadingNode, $createHeadingNode, QuoteNode, $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { MentionNode } from "./MentionNode";
import { MentionPlugin, type Member } from "./MentionPlugin";

export const RICH_EDITOR_THEME = {
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
};

type ToolbarButton = {
  key: string;
  label: React.ReactNode;
  action: (editor: ReturnType<typeof useLexicalComposerContext>[0]) => void;
};

const TOOLBAR_GROUPS: ToolbarButton[][] = [
  [
    { key: "undo", label: <Undo2 size={14} />, action: (ed) => ed.dispatchCommand(UNDO_COMMAND, undefined) },
    { key: "redo", label: <Redo2 size={14} />, action: (ed) => ed.dispatchCommand(REDO_COMMAND, undefined) },
  ],
  [
    { key: "h1", label: <Heading1 size={14} />, action: (ed) => ed.update(() => { const s = $getSelection(); if ($isRangeSelection(s)) $setBlocksType(s, () => $createHeadingNode("h1")); }) },
    { key: "h2", label: <Heading2 size={14} />, action: (ed) => ed.update(() => { const s = $getSelection(); if ($isRangeSelection(s)) $setBlocksType(s, () => $createHeadingNode("h2")); }) },
    { key: "h3", label: <Heading3 size={14} />, action: (ed) => ed.update(() => { const s = $getSelection(); if ($isRangeSelection(s)) $setBlocksType(s, () => $createHeadingNode("h3")); }) },
  ],
  [
    { key: "bold", label: <Bold size={14} />, action: (ed) => ed.dispatchCommand(FORMAT_TEXT_COMMAND, "bold") },
    { key: "italic", label: <Italic size={14} />, action: (ed) => ed.dispatchCommand(FORMAT_TEXT_COMMAND, "italic") },
    { key: "underline", label: <Underline size={14} />, action: (ed) => ed.dispatchCommand(FORMAT_TEXT_COMMAND, "underline") },
    { key: "strikethrough", label: <Strikethrough size={14} />, action: (ed) => ed.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough") },
    { key: "superscript", label: <Superscript size={14} />, action: (ed) => ed.dispatchCommand(FORMAT_TEXT_COMMAND, "superscript") },
    { key: "subscript", label: <Subscript size={14} />, action: (ed) => ed.dispatchCommand(FORMAT_TEXT_COMMAND, "subscript") },
    { key: "code", label: <Code size={14} />, action: (ed) => ed.dispatchCommand(FORMAT_TEXT_COMMAND, "code") },
  ],
  [
    { key: "ul", label: <List size={14} />, action: (ed) => ed.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined) },
    { key: "ol", label: <ListOrdered size={14} />, action: (ed) => ed.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined) },
    { key: "quote", label: <Quote size={14} />, action: (ed) => ed.update(() => { const s = $getSelection(); if ($isRangeSelection(s)) $setBlocksType(s, () => $createQuoteNode()); }) },
  ],
  [
    { key: "left", label: <AlignLeft size={14} />, action: (ed) => ed.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left") },
    { key: "center", label: <AlignCenter size={14} />, action: (ed) => ed.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center") },
    { key: "right", label: <AlignRight size={14} />, action: (ed) => ed.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right") },
    { key: "justify", label: <AlignJustify size={14} />, action: (ed) => ed.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify") },
  ],
  [
    { key: "outdent", label: <Outdent size={14} />, action: (ed) => ed.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined) },
    { key: "indent", label: <Indent size={14} />, action: (ed) => ed.dispatchCommand(INDENT_CONTENT_COMMAND, undefined) },
  ],
];

const FORMAT_KEYS = ["bold", "italic", "underline", "strikethrough", "superscript", "subscript", "code"] as const;

function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    const formats = new Set<string>();
    for (const fmt of FORMAT_KEYS) {
      if (selection.hasFormat(fmt)) formats.add(fmt);
    }
    setActiveFormats(formats);
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(updateToolbar);
    });
  }, [editor, updateToolbar]);

  return (
    <div className="rich-editor__toolbar">
      {TOOLBAR_GROUPS.map((group, i) => (
        <span key={i} className="rich-editor__group">
          {group.map(({ key, label, action }) => (
            <button
              key={key}
              type="button"
              className={`rich-editor__tool${activeFormats.has(key) ? " rich-editor__tool--active" : ""}`}
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

function WordCountPlugin({ onWordCountChange }: { onWordCountChange: (count: number) => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const text = $rootTextContent().trim();
        onWordCountChange(text ? text.split(/\s+/).length : 0);
      });
    });
  }, [editor, onWordCountChange]);

  return null;
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

type RichTextEditorProps = {
  initialContent: string;
  onChange: (json: string) => void;
  onEmptyChange?: (isEmpty: boolean) => void;
  placeholder?: string;
  showWordCount?: boolean;
  members?: Member[];
  readOnly?: boolean;
};

export function RichTextEditor({
  initialContent,
  onChange,
  onEmptyChange,
  placeholder = "Start typing...",
  showWordCount,
  members,
  readOnly = false,
}: RichTextEditorProps) {
  const [wordCount, setWordCount] = useState(0);
  const initialConfig = {
    namespace: "RichTextEditor",
    editable: !readOnly,
    nodes: [ListNode, ListItemNode, HeadingNode, QuoteNode, MentionNode],
    onError: console.error,
    theme: RICH_EDITOR_THEME,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={`rich-editor${readOnly ? " rich-editor--readonly" : ""}`}>
        {!readOnly ? <Toolbar /> : null}
        <div className="rich-editor__content">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="rich-editor__editable"
                aria-placeholder={placeholder}
                placeholder={
                  <div className="rich-editor__placeholder">
                    {placeholder}
                  </div>
                }
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        {showWordCount && <WordCountPlugin onWordCountChange={setWordCount} />}
        {!readOnly ? <HistoryPlugin /> : null}
        <ListPlugin />
        {!readOnly ? (
          <OnChangePlugin
            onChange={(state: EditorState) => {
              onChange(JSON.stringify(state.toJSON()));
              if (onEmptyChange) {
                state.read(() => {
                  onEmptyChange($getRoot().getTextContent().trim().length === 0);
                });
              }
            }}
          />
        ) : null}
        <InitialContentPlugin content={initialContent} />
        {!readOnly ? <TabIndentationPlugin /> : null}
        {!readOnly && members ? <MentionPlugin members={members} /> : null}
      </div>
      {showWordCount && <div className="rich-editor__word-count">{wordCount} words</div>}
    </LexicalComposer>
  );
}
