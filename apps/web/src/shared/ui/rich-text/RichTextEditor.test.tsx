import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RichTextEditor } from "./RichTextEditor";

type UpdateListener = (payload: { editorState: { read: (fn: () => void) => void } }) => void;

const hoisted = vi.hoisted(() => {
  const updateListeners: UpdateListener[] = [];
  const setBlocksTypeMock = vi.fn();
  const mockEditor = {
    registerUpdateListener: vi.fn((listener: UpdateListener) => {
      updateListeners.push(listener);
      return () => {};
    }),
    dispatchCommand: vi.fn(),
    update: vi.fn((fn: () => void) => fn()),
    setEditorState: vi.fn(),
    parseEditorState: vi.fn(),
  };

  return {
    updateListeners,
    setBlocksTypeMock,
    mockEditor,
    selectionIsRange: false,
    selectionFormats: new Set<string>(),
    rootTextContent: "",
    onChangePluginHandler: null as
      | ((state: { toJSON: () => unknown; read: (fn: () => void) => void }) => void)
      | null,
  };
});

vi.mock("@lexical/react/LexicalComposer", () => ({
  LexicalComposer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@lexical/react/LexicalRichTextPlugin", () => ({
  RichTextPlugin: ({ contentEditable }: { contentEditable: React.ReactNode }) => (
    <div data-testid="rich-text-plugin">{contentEditable}</div>
  ),
}));
vi.mock("@lexical/react/LexicalContentEditable", () => ({
  ContentEditable: ({ placeholder, ...props }: { placeholder?: React.ReactNode } & Record<string, unknown>) => (
    <div data-testid="content-editable" {...props}>
      {placeholder}
    </div>
  ),
}));
vi.mock("@lexical/react/LexicalErrorBoundary", () => ({ LexicalErrorBoundary: () => null }));
vi.mock("@lexical/react/LexicalHistoryPlugin", () => ({ HistoryPlugin: () => null }));
vi.mock("@lexical/react/LexicalOnChangePlugin", () => ({
  OnChangePlugin: ({
    onChange,
  }: {
    onChange: (state: { toJSON: () => unknown; read: (fn: () => void) => void }) => void;
  }) => {
    hoisted.onChangePluginHandler = onChange;
    return null;
  },
}));
vi.mock("@lexical/react/LexicalListPlugin", () => ({ ListPlugin: () => null }));
vi.mock("@lexical/react/LexicalTabIndentationPlugin", () => ({ TabIndentationPlugin: () => null }));
vi.mock("@lexical/react/LexicalComposerContext", () => ({
  useLexicalComposerContext: () => [hoisted.mockEditor],
}));
vi.mock("lexical", () => ({
  FORMAT_TEXT_COMMAND: "format_text",
  FORMAT_ELEMENT_COMMAND: "format_element",
  UNDO_COMMAND: "undo",
  REDO_COMMAND: "redo",
  INDENT_CONTENT_COMMAND: "indent",
  OUTDENT_CONTENT_COMMAND: "outdent",
  $getSelection: () => (
    hoisted.selectionIsRange
      ? {
          hasFormat: (format: string) => hoisted.selectionFormats.has(format),
        }
      : null
  ),
  $isRangeSelection: () => hoisted.selectionIsRange,
  $getRoot: () => ({ getTextContent: () => hoisted.rootTextContent }),
  TextNode: class {},
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
vi.mock("@lexical/selection", () => ({ $setBlocksType: hoisted.setBlocksTypeMock }));
vi.mock("@lexical/text", () => ({ $rootTextContent: () => hoisted.rootTextContent }));
vi.mock("./MentionPlugin", () => ({
  MentionPlugin: ({ members }: { members: Array<{ id: number; displayName: string }> }) => (
    <div data-testid="mention-plugin">{members.length}</div>
  ),
}));

function notifyEditorListeners() {
  for (const listener of hoisted.updateListeners) {
    listener({
      editorState: {
        read: (fn) => fn(),
      },
    });
  }
}

describe("RichTextEditor", () => {
  beforeEach(() => {
    hoisted.updateListeners.length = 0;
    hoisted.selectionIsRange = false;
    hoisted.selectionFormats = new Set();
    hoisted.rootTextContent = "";
    hoisted.onChangePluginHandler = null;
    hoisted.setBlocksTypeMock.mockReset();
    hoisted.mockEditor.registerUpdateListener.mockClear();
    hoisted.mockEditor.dispatchCommand.mockClear();
    hoisted.mockEditor.update.mockClear();
    hoisted.mockEditor.setEditorState.mockClear();
    hoisted.mockEditor.parseEditorState.mockReset();
  });

  it("does not show word count by default", () => {
    render(<RichTextEditor initialContent="" onChange={vi.fn()} />);
    expect(screen.queryByText(/words/)).not.toBeInTheDocument();
  });

  it("updates word count and active toolbar state from editor listeners", () => {
    render(<RichTextEditor initialContent="" onChange={vi.fn()} showWordCount />);

    hoisted.rootTextContent = "one two three";
    hoisted.selectionIsRange = true;
    hoisted.selectionFormats = new Set(["bold", "italic"]);

    act(() => {
      notifyEditorListeners();
    });

    expect(screen.getByText("3 words")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Italic" })).toHaveAttribute("aria-pressed", "true");
  });

  it("dispatches toolbar commands and block formatting actions", () => {
    render(<RichTextEditor initialContent="" onChange={vi.fn()} />);

    hoisted.selectionIsRange = true;
    const allButtons = [
      "Undo",
      "Redo",
      "Heading 1",
      "Heading 2",
      "Heading 3",
      "Bold",
      "Italic",
      "Underline",
      "Strikethrough",
      "Superscript",
      "Subscript",
      "Inline code",
      "Bulleted list",
      "Numbered list",
      "Quote",
      "Align left",
      "Align center",
      "Align right",
      "Justify",
      "Outdent",
      "Indent",
    ];
    for (const label of allButtons) {
      fireEvent.mouseDown(screen.getByRole("button", { name: label }));
    }

    expect(hoisted.mockEditor.dispatchCommand).toHaveBeenCalledWith("undo", undefined);
    expect(hoisted.mockEditor.dispatchCommand).toHaveBeenCalledWith("redo", undefined);
    expect(hoisted.mockEditor.dispatchCommand).toHaveBeenCalledWith("ul", undefined);
    expect(hoisted.mockEditor.dispatchCommand).toHaveBeenCalledWith("ol", undefined);
    expect(hoisted.mockEditor.dispatchCommand).toHaveBeenCalledWith("format_element", "center");
    expect(hoisted.mockEditor.dispatchCommand).toHaveBeenCalledWith("indent", undefined);
    expect(hoisted.mockEditor.update).toHaveBeenCalled();
    expect(hoisted.setBlocksTypeMock).toHaveBeenCalled();
  });

  it("initialises editor content and tolerates invalid lexical json", () => {
    hoisted.mockEditor.parseEditorState.mockReturnValueOnce({ ok: true });
    const { unmount } = render(
      <RichTextEditor initialContent='{"root":{"children":[]}}' onChange={vi.fn()} />,
    );
    expect(hoisted.mockEditor.parseEditorState).toHaveBeenCalledWith('{"root":{"children":[]}}');
    expect(hoisted.mockEditor.setEditorState).toHaveBeenCalledWith({ ok: true });
    unmount();

    hoisted.mockEditor.parseEditorState.mockImplementationOnce(() => {
      throw new Error("bad state");
    });
    expect(() =>
      render(<RichTextEditor initialContent="{invalid-json" onChange={vi.fn()} />),
    ).not.toThrow();
  });

  it("forwards lexical change payloads and reports empty state", () => {
    const onChange = vi.fn();
    const onEmptyChange = vi.fn();
    render(<RichTextEditor initialContent="" onChange={onChange} onEmptyChange={onEmptyChange} />);

    const state = {
      toJSON: () => ({ blocks: [1] }),
      read: (fn: () => void) => fn(),
    };

    hoisted.rootTextContent = "   ";
    hoisted.onChangePluginHandler?.(state);
    hoisted.rootTextContent = "notes here";
    hoisted.onChangePluginHandler?.(state);

    expect(onChange).toHaveBeenCalledWith(JSON.stringify({ blocks: [1] }));
    expect(onEmptyChange).toHaveBeenNthCalledWith(1, true);
    expect(onEmptyChange).toHaveBeenNthCalledWith(2, false);
  });

  it("renders mention plugin only when members are provided", () => {
    const { rerender } = render(<RichTextEditor initialContent="" onChange={vi.fn()} />);
    expect(screen.queryByTestId("mention-plugin")).not.toBeInTheDocument();

    rerender(
      <RichTextEditor
        initialContent=""
        onChange={vi.fn()}
        members={[{ id: 1, displayName: "Ayan" }]}
      />,
    );
    expect(screen.getByTestId("mention-plugin")).toHaveTextContent("1");
  });
});
