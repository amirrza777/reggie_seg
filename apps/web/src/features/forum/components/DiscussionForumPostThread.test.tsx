import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DiscussionForumPostThread } from "./DiscussionForumPostThread";
import type { DiscussionForumPostThreadProps } from "./DiscussionForumPostThread.types";
import type { DiscussionPost } from "../types";

vi.mock("@/shared/ui/RichTextEditor", () => ({
  RichTextEditor: ({ initialContent, onChange }: { initialContent: string; onChange: (v: string) => void }) => (
    <textarea data-testid="rich-text-editor" defaultValue={initialContent} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock("@/shared/ui/RichTextViewer", () => ({
  RichTextViewer: ({ content }: { content: string }) => <div data-testid="rich-text-viewer">{content}</div>,
}));

vi.mock("./DiscussionForumPostThread.menu", () => ({
  DiscussionForumPostThreadMenu: ({ isMenuOpen, canReply, onToggleMenu }: {
    isMenuOpen: boolean;
    canReply: boolean;
    onToggleMenu: () => void;
  }) => (
    <div data-testid="post-menu">
      <button onClick={onToggleMenu}>Menu</button>
      {isMenuOpen && canReply && <span>Menu open</span>}
    </div>
  ),
}));

const createPost = (overrides?: Partial<DiscussionPost>): DiscussionPost => ({
  id: 1,
  parentPostId: null,
  title: "Test Post",
  body: "Test body content",
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  reactionScore: 5,
  myReaction: null,
  author: { id: 100, firstName: "John", lastName: "Doe", role: "STUDENT" },
  replies: [],
  ...overrides,
});

const createProps = (overrides?: Partial<DiscussionForumPostThreadProps>): DiscussionForumPostThreadProps => ({
  post: createPost(),
  user: { id: 200, firstName: "Jane", lastName: "Smith", role: "STUDENT" },
  userLoading: false,
  isStudent: true,
  isStaff: false,
  depth: 0,
  expandedRepliesByPostId: {},
  showAllImmediateRepliesByPostId: {},
  menuOpenPostId: null,
  deletingPostId: null,
  reportingPostId: null,
  reactingPostId: null,
  savingPostId: null,
  savingReplyPostId: null,
  editingPostId: null,
  editingTitle: "",
  editingBody: "",
  editingBodyEmpty: false,
  replyOpenByPostId: {},
  replyDrafts: {},
  replyKeyByPostId: {},
  replyEmptyByPostId: {},
  members: [],
  toggleReplies: vi.fn(),
  showMoreReplies: vi.fn(),
  togglePostMenu: vi.fn(),
  closePostMenu: vi.fn(),
  toggleReplyBox: vi.fn(),
  startEditing: vi.fn(),
  cancelEditing: vi.fn(),
  setEditingTitle: vi.fn(),
  setEditingBody: vi.fn(),
  setEditingBodyEmpty: vi.fn(),
  handleUpdate: vi.fn(),
  handleDelete: vi.fn(),
  handleReaction: vi.fn(),
  handleReplyChange: vi.fn(),
  setReplyEmptyByPostId: vi.fn(),
  handleReplySubmit: vi.fn(),
  setReportConfirmation: vi.fn(),
  ...overrides,
});

describe("DiscussionForumPostThread", () => {
  describe("rendering root posts", () => {
    it("renders a root post with title and body", () => {
      const post = createPost({ parentPostId: null, title: "Root Post Title" });
      const props = createProps({ post });

      render(<DiscussionForumPostThread {...props} />);

      expect(screen.getByText("Root Post Title")).toBeInTheDocument();
      expect(screen.getByText("Test body content")).toBeInTheDocument();
    });

    it("displays author information with role pill", () => {
      const props = createProps({
        post: createPost({
          author: { id: 100, firstName: "John", lastName: "Doe", role: "STAFF" },
        }),
      });

      render(<DiscussionForumPostThread {...props} />);

      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });

    it("shows edited timestamp when post was modified", () => {
      const props = createProps({
        post: createPost({
          createdAt: "2026-01-01T10:00:00.000Z",
          updatedAt: "2026-01-01T11:00:00.000Z",
        }),
      });

      render(<DiscussionForumPostThread {...props} />);

      expect(screen.getByText(/Edited:/)).toBeInTheDocument();
    });

    it("does not show edited timestamp when post matches created time", () => {
      const props = createProps({
        post: createPost({
          createdAt: "2026-01-01T10:00:00.000Z",
          updatedAt: "2026-01-01T10:00:00.000Z",
        }),
      });

      render(<DiscussionForumPostThread {...props} />);

      expect(screen.queryByText(/Edited:/)).not.toBeInTheDocument();
    });

    it("marks posts as authored by current user", () => {
      const props = createProps({
        post: createPost({ author: { id: 200, firstName: "Jane", lastName: "Smith", role: "STUDENT" } }),
        user: { id: 200, firstName: "Jane", lastName: "Smith", role: "STUDENT" },
      });

      render(<DiscussionForumPostThread {...props} />);

      expect(screen.getByText(/Jane Smith.*\(You\)/)).toBeInTheDocument();
    });
  });

  describe("rendering reply posts", () => {
    it("renders a reply post without title", () => {
      const post = createPost({ id: 2, parentPostId: 1, title: "Reply Post" });
      const props = createProps({ post });

      render(<DiscussionForumPostThread {...props} />);

      expect(screen.getByText("Test body content")).toBeInTheDocument();
    });

    it("applies correct styling for root vs reply posts", () => {
      const rootProps = createProps({ post: createPost({ parentPostId: null }), depth: 0 });
      const replyProps = createProps({ post: createPost({ parentPostId: 1, id: 2 }), depth: 1 });

      const { container: rootContainer } = render(<DiscussionForumPostThread {...rootProps} />);
      expect(rootContainer.querySelector(".discussion-post--root")).toBeInTheDocument();

      const { container: replyContainer } = render(<DiscussionForumPostThread {...replyProps} />);
      expect(replyContainer.querySelector(".discussion-post--reply")).toBeInTheDocument();
    });
  });

  describe("reply visibility", () => {
    it("shows toggle replies button when post has replies", () => {
      const props = createProps({
        post: createPost({
          replies: [
            createPost({ id: 2, parentPostId: 1, title: "Reply 1" }),
            createPost({ id: 3, parentPostId: 1, title: "Reply 2" }),
          ],
        }),
        expandedRepliesByPostId: { 1: false },
      });

      render(<DiscussionForumPostThread {...props} />);

      expect(screen.getByText(/Show replies \(2\)/)).toBeInTheDocument();
    });

    it("shows 'Hide replies' when expanded", () => {
      const props = createProps({
        post: createPost({
          replies: [createPost({ id: 2, parentPostId: 1 })],
        }),
        expandedRepliesByPostId: { 1: true },
      });

      render(<DiscussionForumPostThread {...props} />);

      expect(screen.getByText("Hide replies")).toBeInTheDocument();
    });

    it("hides toggle button when post has no replies", () => {
      const props = createProps({
        post: createPost({ replies: [] }),
      });

      render(<DiscussionForumPostThread {...props} />);

      expect(screen.queryByText(/Show replies/)).not.toBeInTheDocument();
    });

    it("calls toggleReplies with correct parameters", () => {
      const toggleReplies = vi.fn();
      const post = createPost({
        replies: [createPost({ id: 2, parentPostId: 1 })],
      });
      const props = createProps({
        post,
        toggleReplies,
        expandedRepliesByPostId: { 1: false },
      });

      render(<DiscussionForumPostThread {...props} />);

      fireEvent.click(screen.getByText(/Show replies/));
      expect(toggleReplies).toHaveBeenCalledWith(post, true);
    });
  });

  describe("voting functionality", () => {
    it("renders vote buttons with correct scores", () => {
      const props = createProps({
        post: createPost({ reactionScore: 42, myReaction: null }),
      });

      render(<DiscussionForumPostThread {...props} />);

      expect(screen.getByLabelText("Like post")).toBeInTheDocument();
      expect(screen.getByLabelText("Dislike post")).toBeInTheDocument();
    });

    it("shows active state for user's reaction", () => {
      const props = createProps({
        post: createPost({ reactionScore: 10, myReaction: "LIKE" }),
      });

      render(<DiscussionForumPostThread {...props} />);

      const likeButton = screen.getByLabelText("Remove like");
      expect(likeButton).toBeInTheDocument();
    });

    it("disables voting when user is not logged in", () => {
      const props = createProps({
        user: null,
        post: createPost({ reactionScore: 0 }),
      });

      render(<DiscussionForumPostThread {...props} />);

      expect(screen.getByLabelText("Like post")).toBeDisabled();
    });

    it("calls handleReaction when voting", () => {
      const handleReaction = vi.fn();
      const props = createProps({
        post: createPost(),
        handleReaction,
        reactingPostId: null,
      });

      render(<DiscussionForumPostThread {...props} />);

      fireEvent.click(screen.getByLabelText("Like post"));
      expect(handleReaction).toHaveBeenCalledWith(1, "LIKE");
    });
  });

  describe("menu visibility", () => {
    it("shows menu when user can reply", () => {
      const props = createProps({
        post: createPost(),
        user: { id: 200, firstName: "Jane", lastName: "Smith", role: "STUDENT" },
      });

      render(<DiscussionForumPostThread {...props} />);

      expect(screen.getByTestId("post-menu")).toBeInTheDocument();
    });

    it("shows reported tag for pending student reports", () => {
      const props = createProps({
        isStudent: true,
        post: createPost({
          myStudentReportStatus: "PENDING",
        }),
      });

      render(<DiscussionForumPostThread {...props} />);

      expect(screen.getByText("Reported")).toBeInTheDocument();
    });
  });
});
