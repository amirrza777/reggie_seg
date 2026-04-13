import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ForumConversationTree, type ForumConversationTreePost } from "./ForumConversationTree";

vi.mock("./rich-text/RichTextViewer", () => ({
  RichTextViewer: ({ content }: { content: string }) => <div data-testid="rich-text-viewer">{content}</div>,
}));

const post: ForumConversationTreePost = {
  id: 1,
  title: "Root title",
  body: "Root body",
  createdAt: "2026-03-01T12:00:00.000Z",
  author: { firstName: "Ayan", lastName: "Mamun" },
  replies: [
    {
      id: 2,
      title: "Reply one",
      body: "Reply body",
      createdAt: "2026-03-01T13:00:00.000Z",
      author: { firstName: "Sam", lastName: "Lee" },
      replies: [],
    },
  ],
};

describe("ForumConversationTree", () => {
  it("renders post content recursively and highlights the focus post", () => {
    const { container } = render(<ForumConversationTree post={post} focusPostId={2} />);

    expect(screen.getByText("Root title")).toBeInTheDocument();
    expect(screen.getByText("Root body")).toBeInTheDocument();
    expect(screen.getByText("Reply one")).toBeInTheDocument();
    expect(screen.getByText("Reply body")).toBeInTheDocument();

    const cards = container.querySelectorAll(".card");
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(cards[1]).toHaveStyle({ border: "1px solid var(--primary)" });
  });

  it("renders bodies through the rich text viewer", () => {
    render(<ForumConversationTree post={post} focusPostId={1} />);

    expect(screen.getAllByTestId("rich-text-viewer")).toHaveLength(2);
    expect(screen.getByText("Root body")).toBeInTheDocument();
    expect(screen.getByText("Reply body")).toBeInTheDocument();
  });
});
