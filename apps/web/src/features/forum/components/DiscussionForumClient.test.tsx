import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUser } from "@/features/auth/useUser";
import {
  createDiscussionPost,
  createStudentForumReport,
  deleteDiscussionPost,
  getDiscussionPosts,
  reactToDiscussionPost,
  reportDiscussionPost,
  updateDiscussionPost,
} from "@/features/forum/api/client";
import { DiscussionForumClient } from "./DiscussionForumClient";

vi.mock("@/shared/ui/RichTextEditor", () => ({
  RichTextEditor: ({ onChange, onEmptyChange, placeholder }: { onChange: (v: string) => void; onEmptyChange?: (e: boolean) => void; placeholder?: string }) => (
    <textarea
      placeholder={placeholder}
      onChange={(e) => {
        onChange(e.target.value);
        onEmptyChange?.(e.target.value.trim().length === 0);
      }}
    />
  ),
}));

vi.mock("@/shared/ui/RichTextViewer", () => ({
  RichTextViewer: ({ content }: { content: string }) => <p>{content}</p>,
}));

vi.mock("@/features/auth/useUser", () => ({
  useUser: vi.fn(),
}));

vi.mock("@/features/forum/api/client", () => ({
  createDiscussionPost: vi.fn(),
  createStudentForumReport: vi.fn(),
  deleteDiscussionPost: vi.fn(),
  getDiscussionPosts: vi.fn(),
  reactToDiscussionPost: vi.fn(),
  reportDiscussionPost: vi.fn(),
  updateDiscussionPost: vi.fn(),
}));

const useUserMock = vi.mocked(useUser);
const createDiscussionPostMock = vi.mocked(createDiscussionPost);
const createStudentForumReportMock = vi.mocked(createStudentForumReport);
const deleteDiscussionPostMock = vi.mocked(deleteDiscussionPost);
const getDiscussionPostsMock = vi.mocked(getDiscussionPosts);
const reactToDiscussionPostMock = vi.mocked(reactToDiscussionPost);
const reportDiscussionPostMock = vi.mocked(reportDiscussionPost);
const updateDiscussionPostMock = vi.mocked(updateDiscussionPost);

function makePost(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    parentPostId: null,
    title: "Root post",
    body: "Root body",
    createdAt: "2026-03-22T10:00:00.000Z",
    updatedAt: "2026-03-22T10:00:00.000Z",
    reactionScore: 0,
    myReaction: null,
    myStudentReportStatus: null,
    author: { id: 2, firstName: "Takao", lastName: "Watson", role: "STUDENT" as const },
    replies: [],
    ...overrides,
  };
}

describe("DiscussionForumClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserMock.mockReturnValue({
      user: {
        id: 1,
        firstName: "Ayan",
        lastName: "Mamun",
        role: "STUDENT",
        isStaff: false,
        isAdmin: false,
        isEnterpriseAdmin: false,
      },
      loading: false,
    } as ReturnType<typeof useUser>);
  });

  it("keeps replies collapsed by default and re-collapses nested threads when parent is hidden", async () => {
    getDiscussionPostsMock.mockResolvedValue([
      {
        id: 100,
        parentPostId: null,
        title: "Root post",
        body: "Root body",
        createdAt: "2026-03-22T10:00:00.000Z",
        updatedAt: "2026-03-22T10:00:00.000Z",
        reactionScore: 0,
        myReaction: null,
        myStudentReportStatus: null,
        author: { id: 2, firstName: "Takao", lastName: "Watson", role: "STUDENT" },
        replies: [
          {
            id: 200,
            parentPostId: 100,
            title: "",
            body: "First reply",
            createdAt: "2026-03-22T10:10:00.000Z",
            updatedAt: "2026-03-22T10:10:00.000Z",
            reactionScore: 0,
            myReaction: null,
            myStudentReportStatus: null,
            author: { id: 3, firstName: "Takako", lastName: "Watson", role: "STUDENT" },
            replies: [
              {
                id: 300,
                parentPostId: 200,
                title: "",
                body: "Nested reply",
                createdAt: "2026-03-22T10:20:00.000Z",
                updatedAt: "2026-03-22T10:20:00.000Z",
                reactionScore: 0,
                myReaction: null,
                myStudentReportStatus: null,
                author: { id: 4, firstName: "Takizo", lastName: "Watson", role: "STUDENT" },
                replies: [],
              },
            ],
          },
        ],
      },
    ]);

    render(<DiscussionForumClient projectId="9" />);

    await waitFor(() => {
      expect(getDiscussionPostsMock).toHaveBeenCalledWith(1, 9);
    });

    expect(screen.getByText("Root body")).toBeInTheDocument();
    expect(screen.queryByText("First reply")).not.toBeInTheDocument();
    expect(screen.queryByText("Nested reply")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show replies (1)" }));
    expect(screen.getByText("First reply")).toBeInTheDocument();
    expect(screen.queryByText("Nested reply")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show replies (1)" }));
    expect(screen.getByText("Nested reply")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Hide replies" })[0]);
    expect(screen.queryByText("First reply")).not.toBeInTheDocument();
    expect(screen.queryByText("Nested reply")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show replies (1)" }));
    expect(screen.getByText("First reply")).toBeInTheDocument();
    expect(screen.queryByText("Nested reply")).not.toBeInTheDocument();
  });

  it("reorders sibling replies after a reaction so the highest scored reply is first", async () => {
    getDiscussionPostsMock.mockResolvedValue([
      {
        id: 100,
        parentPostId: null,
        title: "Root post",
        body: "Root body",
        createdAt: "2026-03-22T10:00:00.000Z",
        updatedAt: "2026-03-22T10:00:00.000Z",
        reactionScore: 0,
        myReaction: null,
        myStudentReportStatus: null,
        author: { id: 2, firstName: "Takao", lastName: "Watson", role: "STUDENT" },
        replies: [
          {
            id: 201,
            parentPostId: 100,
            title: "",
            body: "Higher scored reply",
            createdAt: "2026-03-22T10:05:00.000Z",
            updatedAt: "2026-03-22T10:05:00.000Z",
            reactionScore: 1,
            myReaction: null,
            myStudentReportStatus: null,
            author: { id: 3, firstName: "Takako", lastName: "Watson", role: "STUDENT" },
            replies: [],
          },
          {
            id: 202,
            parentPostId: 100,
            title: "",
            body: "Lower scored reply",
            createdAt: "2026-03-22T10:10:00.000Z",
            updatedAt: "2026-03-22T10:10:00.000Z",
            reactionScore: 0,
            myReaction: null,
            myStudentReportStatus: null,
            author: { id: 4, firstName: "Takizo", lastName: "Watson", role: "STUDENT" },
            replies: [],
          },
        ],
      },
    ]);

    reactToDiscussionPostMock.mockResolvedValue({
      id: 202,
      parentPostId: 100,
      title: "",
      body: "Lower scored reply",
      createdAt: "2026-03-22T10:10:00.000Z",
      updatedAt: "2026-03-22T10:15:00.000Z",
      reactionScore: 2,
      myReaction: "LIKE",
      myStudentReportStatus: null,
      author: { id: 4, firstName: "Takizo", lastName: "Watson", role: "STUDENT" },
      replies: [],
    });

    render(<DiscussionForumClient projectId="9" />);

    await waitFor(() => {
      expect(getDiscussionPostsMock).toHaveBeenCalledWith(1, 9);
    });

    fireEvent.click(screen.getByRole("button", { name: "Show replies (2)" }));

    const lowerReplyCard = screen.getByText("Lower scored reply").closest("article");
    expect(lowerReplyCard).not.toBeNull();
    fireEvent.click(within(lowerReplyCard as HTMLElement).getByRole("button", { name: "Like post" }));

    await waitFor(() => {
      expect(reactToDiscussionPostMock).toHaveBeenCalledWith(1, 9, 202, "LIKE");
    });

    const firstReplyBody = screen.getAllByText(/scored reply$/i)[0];
    expect(firstReplyBody).toHaveTextContent("Lower scored reply");
  });

  it("expands the replied thread and shows a newly posted reply", async () => {
    getDiscussionPostsMock.mockResolvedValue([
      {
        id: 100,
        parentPostId: null,
        title: "Root post",
        body: "Root body",
        createdAt: "2026-03-22T10:00:00.000Z",
        updatedAt: "2026-03-22T10:00:00.000Z",
        reactionScore: 0,
        myReaction: null,
        myStudentReportStatus: null,
        author: { id: 2, firstName: "Takao", lastName: "Watson", role: "STUDENT" },
        replies: [
          {
            id: 201,
            parentPostId: 100,
            title: "",
            body: "Older reply 1",
            createdAt: "2026-03-22T10:05:00.000Z",
            updatedAt: "2026-03-22T10:05:00.000Z",
            reactionScore: 0,
            myReaction: null,
            myStudentReportStatus: null,
            author: { id: 3, firstName: "Takako", lastName: "Watson", role: "STUDENT" },
            replies: [],
          },
          {
            id: 202,
            parentPostId: 100,
            title: "",
            body: "Older reply 2",
            createdAt: "2026-03-22T10:10:00.000Z",
            updatedAt: "2026-03-22T10:10:00.000Z",
            reactionScore: 0,
            myReaction: null,
            myStudentReportStatus: null,
            author: { id: 4, firstName: "Takizo", lastName: "Watson", role: "STUDENT" },
            replies: [],
          },
          {
            id: 203,
            parentPostId: 100,
            title: "",
            body: "Older reply 3",
            createdAt: "2026-03-22T10:15:00.000Z",
            updatedAt: "2026-03-22T10:15:00.000Z",
            reactionScore: 0,
            myReaction: null,
            myStudentReportStatus: null,
            author: { id: 5, firstName: "Takimi", lastName: "Watson", role: "STUDENT" },
            replies: [],
          },
        ],
      },
    ]);

    createDiscussionPostMock.mockResolvedValue({
      id: 204,
      parentPostId: 100,
      title: "",
      body: "Newest reply",
      createdAt: "2026-03-22T10:20:00.000Z",
      updatedAt: "2026-03-22T10:20:00.000Z",
      reactionScore: 0,
      myReaction: null,
      myStudentReportStatus: null,
      author: { id: 1, firstName: "Ayan", lastName: "Mamun", role: "STUDENT" },
      replies: [],
    });

    render(<DiscussionForumClient projectId="9" />);

    await waitFor(() => {
      expect(getDiscussionPostsMock).toHaveBeenCalledWith(1, 9);
    });

    expect(screen.queryByText("Older reply 1")).not.toBeInTheDocument();

    const rootCard = screen.getByText("Root body").closest("article");
    expect(rootCard).not.toBeNull();
    const rootCardElement = rootCard as HTMLElement;

    fireEvent.click(within(rootCardElement).getByRole("button", { name: "Post actions" }));
    fireEvent.click(within(rootCardElement).getByRole("button", { name: "Reply" }));
    fireEvent.change(within(rootCardElement).getByPlaceholderText("Write a reply"), { target: { value: "Newest reply" } });
    fireEvent.click(within(rootCardElement).getByRole("button", { name: "Post reply" }));

    await waitFor(() => {
      expect(createDiscussionPostMock).toHaveBeenCalledWith(1, 9, {
        title: "",
        body: "Newest reply",
        parentPostId: 100,
      });
    });

    expect(screen.getByText("Newest reply")).toBeInTheDocument();
    expect(within(rootCardElement).getByRole("button", { name: "Hide replies" })).toBeInTheDocument();
  });

  it("prioritizes non-student replies above student replies within the same nesting level", async () => {
    getDiscussionPostsMock.mockResolvedValue([
      {
        id: 100,
        parentPostId: null,
        title: "Root post",
        body: "Root body",
        createdAt: "2026-03-22T10:00:00.000Z",
        updatedAt: "2026-03-22T10:00:00.000Z",
        reactionScore: 0,
        myReaction: null,
        myStudentReportStatus: null,
        author: { id: 2, firstName: "Takao", lastName: "Watson", role: "STUDENT" },
        replies: [
          {
            id: 201,
            parentPostId: 100,
            title: "",
            body: "Student higher score",
            createdAt: "2026-03-22T10:05:00.000Z",
            updatedAt: "2026-03-22T10:05:00.000Z",
            reactionScore: 3,
            myReaction: null,
            myStudentReportStatus: null,
            author: { id: 3, firstName: "Takako", lastName: "Watson", role: "STUDENT" },
            replies: [],
          },
          {
            id: 202,
            parentPostId: 100,
            title: "",
            body: "TA lower score",
            createdAt: "2026-03-22T10:10:00.000Z",
            updatedAt: "2026-03-22T10:10:00.000Z",
            reactionScore: 0,
            myReaction: null,
            myStudentReportStatus: null,
            author: { id: 4, firstName: "Takizo", lastName: "Watson", role: "STAFF" },
            replies: [],
          },
        ],
      },
    ]);

    render(<DiscussionForumClient projectId="9" />);

    await waitFor(() => {
      expect(getDiscussionPostsMock).toHaveBeenCalledWith(1, 9);
    });

    fireEvent.click(screen.getByRole("button", { name: "Show replies (2)" }));

    const firstReplyBody = screen.getAllByText(/score$/i)[0];
    expect(firstReplyBody).toHaveTextContent("TA lower score");
  });

  it("omits the panel heading when showHeader is false", async () => {
    getDiscussionPostsMock.mockResolvedValue([]);

    render(<DiscussionForumClient projectId="9" showHeader={false} />);

    await waitFor(() => {
      expect(getDiscussionPostsMock).toHaveBeenCalledWith(1, 9);
    });

    expect(screen.queryByRole("heading", { name: "Discussion Forum", level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Latest posts", level: 2 })).toBeInTheDocument();
  });

  it("shows sign-in guidance and skips loading posts when user is unavailable", () => {
    useUserMock.mockReturnValue({
      user: null,
      loading: false,
    } as ReturnType<typeof useUser>);

    render(<DiscussionForumClient projectId="9" />);

    expect(getDiscussionPostsMock).not.toHaveBeenCalled();
    expect(screen.getByText("Please sign in to create a post.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
  });

  it("shows a load error when fetching discussion posts fails", async () => {
    getDiscussionPostsMock.mockRejectedValueOnce(new Error("boom"));

    render(<DiscussionForumClient projectId="9" />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load discussion posts.")).toBeInTheDocument();
    });
  });

  it("creates a new root post and clears composer fields", async () => {
    getDiscussionPostsMock.mockResolvedValue([]);
    createDiscussionPostMock.mockResolvedValue(
      makePost({
        id: 501,
        title: "New title",
        body: "New body",
        author: { id: 1, firstName: "Ayan", lastName: "Mamun", role: "STUDENT" },
      })
    );

    render(<DiscussionForumClient projectId="9" />);
    await waitFor(() => expect(getDiscussionPostsMock).toHaveBeenCalledWith(1, 9));

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "New title" } });
    fireEvent.change(screen.getByPlaceholderText("Write your update or question"), { target: { value: "New body" } });
    fireEvent.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => {
      expect(createDiscussionPostMock).toHaveBeenCalledWith(1, 9, {
        title: "New title",
        body: "New body",
      });
    });

    expect(screen.getByText("New body")).toBeInTheDocument();
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("");
    expect((screen.getByPlaceholderText("Write your update or question") as HTMLTextAreaElement).value).toBe("");
  });

  it("shows a composer error when creating a post fails", async () => {
    getDiscussionPostsMock.mockResolvedValue([]);
    createDiscussionPostMock.mockRejectedValueOnce(new Error("create-failed"));

    render(<DiscussionForumClient projectId="9" />);
    await waitFor(() => expect(getDiscussionPostsMock).toHaveBeenCalledWith(1, 9));

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Root title" } });
    fireEvent.change(screen.getByPlaceholderText("Write your update or question"), { target: { value: "Root body" } });
    fireEvent.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to create post.")).toBeInTheDocument();
    });
  });

  it("edits and saves an owned post", async () => {
    getDiscussionPostsMock.mockResolvedValue([
      makePost({
        id: 700,
        title: "Original title",
        body: "Original body",
        author: { id: 1, firstName: "Ayan", lastName: "Mamun", role: "STUDENT" },
      }),
    ]);
    updateDiscussionPostMock.mockResolvedValue(
      makePost({
        id: 700,
        title: "Edited title",
        body: "Edited body",
        createdAt: "2026-03-22T10:00:00.000Z",
        updatedAt: "2026-03-22T10:25:00.000Z",
        author: { id: 1, firstName: "Ayan", lastName: "Mamun", role: "STUDENT", forumRole: "MODULE_LEAD" },
      })
    );

    render(<DiscussionForumClient projectId="9" />);
    await waitFor(() => expect(getDiscussionPostsMock).toHaveBeenCalledWith(1, 9));

    const article = screen.getByText("Original body").closest("article") as HTMLElement;
    fireEvent.click(within(article).getByRole("button", { name: "Post actions" }));
    fireEvent.click(within(article).getByRole("button", { name: "Edit" }));
    fireEvent.change(within(article).getByLabelText("Title"), { target: { value: "Edited title" } });
    fireEvent.change(within(article).getAllByRole("textbox")[1], { target: { value: "Edited body" } });
    fireEvent.click(within(article).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateDiscussionPostMock).toHaveBeenCalledWith(1, 9, 700, {
        title: "Edited title",
        body: "Edited body",
      });
    });
    expect(screen.getByText("Edited body")).toBeInTheDocument();
    expect(screen.getByText("Module Lead")).toBeInTheDocument();
    expect(screen.getByText(/Edited:/)).toBeInTheDocument();
  });

  it("deletes an owned post from the menu", async () => {
    getDiscussionPostsMock.mockResolvedValue([
      makePost({
        id: 800,
        body: "Delete me",
        author: { id: 1, firstName: "Ayan", lastName: "Mamun", role: "STUDENT" },
      }),
    ]);
    deleteDiscussionPostMock.mockResolvedValue(undefined as never);

    render(<DiscussionForumClient projectId="9" />);
    await waitFor(() => expect(getDiscussionPostsMock).toHaveBeenCalledWith(1, 9));

    const article = screen.getByText("Delete me").closest("article") as HTMLElement;
    fireEvent.click(within(article).getByRole("button", { name: "Post actions" }));
    fireEvent.click(within(article).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteDiscussionPostMock).toHaveBeenCalledWith(1, 9, 800));
    expect(screen.queryByText("Delete me")).not.toBeInTheDocument();
  });

  it("reports posts as student and as staff through the menu", async () => {
    getDiscussionPostsMock.mockResolvedValue([
      makePost({
        id: 900,
        body: "Report target",
        author: { id: 2, firstName: "Other", lastName: "Student", role: "STUDENT" },
      }),
    ]);
    createStudentForumReportMock.mockResolvedValue({} as never);

    const { rerender } = render(<DiscussionForumClient projectId="9" />);
    await waitFor(() => expect(getDiscussionPostsMock).toHaveBeenCalledWith(1, 9));

    const studentArticle = screen.getByText("Report target").closest("article") as HTMLElement;
    fireEvent.click(within(studentArticle).getByRole("button", { name: "Post actions" }));
    fireEvent.click(within(studentArticle).getByRole("button", { name: "Report" }));
    fireEvent.click(screen.getByRole("button", { name: "Report post" }));

    await waitFor(() => expect(createStudentForumReportMock).toHaveBeenCalledWith(1, 9, 900));
    expect(screen.getByText("Reported")).toBeInTheDocument();

    useUserMock.mockReturnValue({
      user: {
        id: 3,
        firstName: "Staff",
        lastName: "User",
        role: "STAFF",
        isStaff: true,
        isAdmin: false,
        isEnterpriseAdmin: false,
      },
      loading: false,
    } as ReturnType<typeof useUser>);
    reportDiscussionPostMock.mockResolvedValue(undefined as never);

    rerender(<DiscussionForumClient projectId="9" />);
    await waitFor(() => expect(getDiscussionPostsMock).toHaveBeenCalledWith(3, 9));

    const staffArticle = screen.getByText("Report target").closest("article") as HTMLElement;
    fireEvent.click(within(staffArticle).getByRole("button", { name: "Post actions" }));
    fireEvent.click(within(staffArticle).getByRole("button", { name: "Report" }));
    fireEvent.click(screen.getByRole("button", { name: "Report post" }));

    await waitFor(() => expect(reportDiscussionPostMock).toHaveBeenCalledWith(3, 9, 900));
    expect(screen.queryByText("Report target")).not.toBeInTheDocument();
  });

  it("closes an open post menu when clicking outside", async () => {
    getDiscussionPostsMock.mockResolvedValue([
      makePost({
        id: 950,
        body: "Menu post",
        author: { id: 1, firstName: "Ayan", lastName: "Mamun", role: "STUDENT" },
      }),
    ]);

    render(<DiscussionForumClient projectId="9" />);
    await waitFor(() => expect(getDiscussionPostsMock).toHaveBeenCalledWith(1, 9));

    const article = screen.getByText("Menu post").closest("article") as HTMLElement;
    fireEvent.click(within(article).getByRole("button", { name: "Post actions" }));
    expect(within(article).getByRole("button", { name: "Edit" })).toBeInTheDocument();

    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await waitFor(() => {
      expect(within(article).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    });
  });

  it("shows reply pagination controls and root-post pagination", async () => {
    const replies = Array.from({ length: 4 }, (_, index) =>
      makePost({
        id: 2000 + index,
        parentPostId: 1000,
        title: "",
        body: `Reply ${index + 1}`,
        createdAt: `2026-03-22T10:0${index}:00.000Z`,
        updatedAt: `2026-03-22T10:0${index}:00.000Z`,
        author: { id: 20 + index, firstName: "Reply", lastName: `User ${index + 1}`, role: "STUDENT" },
      })
    );

    const rootPosts = Array.from({ length: 9 }, (_, index) =>
      makePost({
        id: index + 1,
        title: `Root ${index + 1}`,
        body: `Root body ${index + 1}`,
        replies: index === 0 ? replies : [],
      })
    );

    getDiscussionPostsMock.mockResolvedValue(rootPosts);
    render(<DiscussionForumClient projectId="9" />);

    await waitFor(() => expect(getDiscussionPostsMock).toHaveBeenCalledWith(1, 9));
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Root body 1")).toBeInTheDocument();
    expect(screen.queryByText("Root body 9")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("Root body 9")).toBeInTheDocument();
    expect(screen.queryByText("Root body 1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show replies (4)" }));
    expect(screen.queryByText("Reply 4")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(screen.getByText("Reply 4")).toBeInTheDocument();
  });
});
