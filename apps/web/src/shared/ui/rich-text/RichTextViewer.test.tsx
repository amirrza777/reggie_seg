import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RichTextViewer } from "./RichTextViewer";

vi.mock("@lexical/react/LexicalComposer", () => ({
  LexicalComposer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="lexical-composer">{children}</div>
  ),
}));
vi.mock("@lexical/react/LexicalRichTextPlugin", () => ({
  RichTextPlugin: ({ contentEditable }: { contentEditable: React.ReactNode }) => (
    <div data-testid="rich-text-plugin">{contentEditable}</div>
  ),
}));
vi.mock("@lexical/react/LexicalContentEditable", () => ({
  ContentEditable: ({ className }: { className?: string }) => (
    <div data-testid="content-editable" className={className} />
  ),
}));
vi.mock("@lexical/react/LexicalErrorBoundary", () => ({ LexicalErrorBoundary: () => null }));
vi.mock("@lexical/react/LexicalListPlugin", () => ({ ListPlugin: () => null }));
vi.mock("@lexical/list", () => ({ ListNode: class {}, ListItemNode: class {} }));
vi.mock("@lexical/rich-text", () => ({ HeadingNode: class {}, QuoteNode: class {} }));

const validLexicalJson = JSON.stringify({
  root: { children: [], direction: "ltr", format: "", indent: 0, type: "root", version: 1 },
});

describe("RichTextViewer", () => {
  it("renders plain text as a paragraph", () => {
    const { container } = render(<RichTextViewer content="Hello world" />);
    expect(container.querySelector("p")).toHaveTextContent("Hello world");
    expect(container.querySelector("p")).toHaveClass("rich-editor__plain");
  });

  it("renders empty content as a paragraph", () => {
    const { container } = render(<RichTextViewer content="" />);
    expect(container.querySelector("p")).toBeInTheDocument();
  });

  it("renders a JSON object without a root key as a paragraph", () => {
    const { container } = render(<RichTextViewer content='{"not": "lexical"}' />);
    expect(container.querySelector("p")).toBeInTheDocument();
    expect(screen.queryByTestId("lexical-composer")).not.toBeInTheDocument();
  });

  it("renders malformed JSON content as a paragraph", () => {
    const { container } = render(<RichTextViewer content="{" />);
    expect(container.querySelector("p")).toBeInTheDocument();
    expect(screen.queryByTestId("lexical-composer")).not.toBeInTheDocument();
  });

  it("applies no-padding class for plain text mode", () => {
    const { container } = render(<RichTextViewer content="Plain" noPadding />);
    expect(container.querySelector("p")).toHaveClass("rich-editor__plain--no-padding");
  });

  it("renders the lexical composer for valid lexical JSON", () => {
    const { container } = render(<RichTextViewer content={validLexicalJson} />);
    expect(screen.getByTestId("lexical-composer")).toBeInTheDocument();
    expect(screen.getByTestId("content-editable")).toHaveClass("rich-editor__editable--readonly");
    expect(screen.getByTestId("content-editable")).not.toHaveClass("rich-editor__editable--no-padding");
    expect(screen.getByTestId("rich-text-plugin")).toBeInTheDocument();
    expect(container.querySelector("p")).not.toBeInTheDocument();
  });

  it("applies no-padding class in lexical readonly mode", () => {
    render(<RichTextViewer content={validLexicalJson} noPadding />);
    expect(screen.getByTestId("content-editable")).toHaveClass("rich-editor__editable--no-padding");
  });
});
