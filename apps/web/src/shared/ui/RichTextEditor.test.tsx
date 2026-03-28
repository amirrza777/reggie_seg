import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RichTextEditor } from "./RichTextEditor";

const mockEditor = {
  registerUpdateListener: vi.fn(() => () => {}),
  dispatchCommand: vi.fn(),
  update: vi.fn(),
  setEditorState: vi.fn(),
  parseEditorState: vi.fn(),
};

vi.mock("@lexical/react/LexicalComposer", () => ({
  LexicalComposer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@lexical/react/LexicalRichTextPlugin", () => ({ RichTextPlugin: () => null }));
vi.mock("@lexical/react/LexicalContentEditable", () => ({ ContentEditable: () => null }));
vi.mock("@lexical/react/LexicalErrorBoundary", () => ({ LexicalErrorBoundary: () => null }));
vi.mock("@lexical/react/LexicalHistoryPlugin", () => ({ HistoryPlugin: () => null }));
vi.mock("@lexical/react/LexicalOnChangePlugin", () => ({ OnChangePlugin: () => null }));
vi.mock("@lexical/react/LexicalListPlugin", () => ({ ListPlugin: () => null }));
vi.mock("@lexical/react/LexicalTabIndentationPlugin", () => ({ TabIndentationPlugin: () => null }));
vi.mock("@lexical/react/LexicalComposerContext", () => ({
  useLexicalComposerContext: () => [mockEditor],
}));
vi.mock("lexical", () => ({
  FORMAT_TEXT_COMMAND: "format_text",
  FORMAT_ELEMENT_COMMAND: "format_element",
  UNDO_COMMAND: "undo",
  REDO_COMMAND: "redo",
  INDENT_CONTENT_COMMAND: "indent",
  OUTDENT_CONTENT_COMMAND: "outdent",
  $getSelection: () => null,
  $isRangeSelection: () => false,
  $getRoot: () => ({ getTextContent: () => "" }),
}));
vi.mock("@lexical/list", () => ({
  ListNode: class {},
  ListItemNode: class {},
  INSERT_UNORDERED_LIST_COMMAND: "ul",
  INSERT_ORDERED_LIST_COMMAND: "ol",
}));
vi.mock("@lexical/rich-text", () => ({
  HeadingNode: class {},
  QuoteNode: class {},
  $createHeadingNode: () => ({}),
  $createQuoteNode: () => ({}),
}));
vi.mock("@lexical/selection", () => ({ $setBlocksType: vi.fn() }));
vi.mock("@lexical/text", () => ({ $rootTextContent: () => "" }));

describe("RichTextEditor", () => {
  it("does not show word count by default", () => {
    render(<RichTextEditor initialContent="" onChange={vi.fn()} />);
    expect(screen.queryByText(/words/)).not.toBeInTheDocument();
  });

  it("shows word count when showWordCount is true", () => {
    render(<RichTextEditor initialContent="" onChange={vi.fn()} showWordCount />);
    expect(screen.getByText("0 words")).toBeInTheDocument();
  });
});
