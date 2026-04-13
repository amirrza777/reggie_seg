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

  it("handles posts without titles gracefully", () => {
    const postWithoutTitle: ForumConversationTreePost = {
      id: 1,
      title: "",
      body: "Body content",
      createdAt: "2026-03-01T12:00:00.000Z",
      author: { firstName: "John", lastName: "Doe" },
      replies: [],
    };
    render(<ForumConversationTree post={postWithoutTitle} focusPostId={1} />);

    expect(screen.getByText("Body content")).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
  });

  it("renders nested replies with correct depth styling", () => {
    const deepPost: ForumConversationTreePost = {
      id: 1,
      title: "Parent",
      body: "Parent body",
      createdAt: "2026-03-01T12:00:00.000Z",
      author: { firstName: "P", lastName: "Parent" },
      replies: [
        {
          id: 2,
          title: "Child",
          body: "Child body",
          createdAt: "2026-03-01T13:00:00.000Z",
          author: { firstName: "C", lastName: "Child" },
          replies: [
            {
              id: 3,
              title: "Grandchild",
              body: "Grandchild body",
              createdAt: "2026-03-01T14:00:00.000Z",
              author: { firstName: "G", lastName: "Grandchild" },
              replies: [],
            },
          ],
        },
      ],
    };
    const { container } = render(<ForumConversationTree post={deepPost} focusPostId={3} />);

    expect(screen.getByText("Parent")).toBeInTheDocument();
    expect(screen.getByText("Child")).toBeInTheDocument();
    expect(screen.getByText("Grandchild")).toBeInTheDocument();

    const cards = container.querySelectorAll(".card");
    expect(cards.length).toBe(3);
    
    // Check that depth styling increases marginLeft (0, 16, 32)
    const parentCard = cards[0] as HTMLElement;
    const childCard = cards[1] as HTMLElement;
    const grandchildCard = cards[2] as HTMLElement;
    
    expect(parentCard.style.marginLeft).toBe("0px");
    expect(childCard.style.marginLeft).toBe("16px");
    expect(grandchildCard.style.marginLeft).toBe("32px");
  });
});
