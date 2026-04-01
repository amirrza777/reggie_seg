import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

let onChangeFn: ((state: any) => void) | null = null;
const dispatchCommandMock = vi.fn();

const mockEditor = {
  registerUpdateListener: vi.fn(() => () => {}),
  dispatchCommand: dispatchCommandMock,
  update: vi.fn(),
  setEditorState: vi.fn(),
  parseEditorState: vi.fn(),
};

vi.mock("@lexical/react/LexicalComposer", () => ({
  LexicalComposer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@lexical/react/LexicalPlainTextPlugin", () => ({ PlainTextPlugin: () => null }));
vi.mock("@lexical/react/LexicalContentEditable", () => ({ ContentEditable: () => null }));
vi.mock("@lexical/react/LexicalErrorBoundary", () => ({ LexicalErrorBoundary: () => null }));
vi.mock("@lexical/react/LexicalClearEditorPlugin", () => ({ ClearEditorPlugin: () => null }));
vi.mock("@lexical/react/LexicalOnChangePlugin", () => ({
  OnChangePlugin: ({ onChange }: { onChange: (state: any) => void }) => {
    onChangeFn = onChange;
    return null;
  },
}));
vi.mock("@lexical/react/LexicalComposerContext", () => ({
  useLexicalComposerContext: () => [mockEditor],
}));
vi.mock("@/shared/ui/MentionPlugin", () => ({ MentionPlugin: () => null }));
vi.mock("@/shared/ui/MentionNode", () => ({ MentionNode: class {} }));
vi.mock("lexical", () => ({
  $getRoot: vi.fn(),
  CLEAR_EDITOR_COMMAND: "clear_editor",
}));

import { $getRoot } from "lexical";
import { CommentInput } from "./CommentInput";

const $getRootMock = vi.mocked($getRoot);

function simulateTyping(text: string) {
  const mockState = {
    read: (fn: () => void) => {
      $getRootMock.mockReturnValue({ getTextContent: () => text } as any);
      fn();
    },
  };
  act(() => {
    onChangeFn?.(mockState);
  });
}

const members = [
  { id: 1, firstName: "Reggie", lastName: "King" },
  { id: 2, firstName: "Alex", lastName: "Smith" },
];

describe("CommentInput", () => {
  beforeEach(() => {
    onChangeFn = null;
    dispatchCommandMock.mockReset();
    $getRootMock.mockReset();
  });

  it("renders the label and post button", () => {
    render(<CommentInput members={members} onPost={vi.fn()} />);

    expect(screen.getByText("Add a comment")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post Comment" })).toBeInTheDocument();
  });

  it("disables the post button when text is empty", () => {
    render(<CommentInput members={members} onPost={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Post Comment" })).toBeDisabled();
  });

  it("disables the post button when text is only whitespace", () => {
    render(<CommentInput members={members} onPost={vi.fn()} />);

    simulateTyping("   ");

    expect(screen.getByRole("button", { name: "Post Comment" })).toBeDisabled();
  });

  it("enables the post button when text has content", () => {
    render(<CommentInput members={members} onPost={vi.fn()} />);

    simulateTyping("Hello team");

    expect(screen.getByRole("button", { name: "Post Comment" })).toBeEnabled();
  });

  it("calls onPost with trimmed text when post button is clicked", async () => {
    const onPost = vi.fn().mockResolvedValue(undefined);
    render(<CommentInput members={members} onPost={onPost} />);

    simulateTyping("  Hello team  ");
    fireEvent.click(screen.getByRole("button", { name: "Post Comment" }));

    await waitFor(() => {
      expect(onPost).toHaveBeenCalledWith("Hello team");
    });
  });

  it("shows loading text while posting", async () => {
    let resolvePost: () => void;
    const onPost = vi.fn().mockImplementation(
      () => new Promise<void>((resolve) => { resolvePost = resolve; }),
    );

    render(<CommentInput members={members} onPost={onPost} />);

    simulateTyping("Hello");
    fireEvent.click(screen.getByRole("button", { name: "Post Comment" }));

    expect(screen.getByRole("button", { name: "Posting..." })).toBeDisabled();

    await waitFor(async () => {
      resolvePost!();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Post Comment" })).toBeInTheDocument();
    });
  });

  it("clears the editor after posting", async () => {
    const onPost = vi.fn().mockResolvedValue(undefined);
    render(<CommentInput members={members} onPost={onPost} />);

    simulateTyping("Hello");
    fireEvent.click(screen.getByRole("button", { name: "Post Comment" }));

    await waitFor(() => {
      expect(dispatchCommandMock).toHaveBeenCalledWith("clear_editor", undefined);
    });
  });

  it("does not call onPost when text is empty", () => {
    const onPost = vi.fn();
    render(<CommentInput members={members} onPost={onPost} />);

    simulateTyping("");
    fireEvent.click(screen.getByRole("button", { name: "Post Comment" }));

    expect(onPost).not.toHaveBeenCalled();
  });
});
