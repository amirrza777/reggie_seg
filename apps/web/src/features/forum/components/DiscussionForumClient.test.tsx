import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUser } from "@/features/auth/context";
import { getDiscussionPosts } from "@/features/forum/api/client";
import { DiscussionForumClient } from "./DiscussionForumClient";

vi.mock("@/features/auth/context", () => ({
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
const getDiscussionPostsMock = vi.mocked(getDiscussionPosts);

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
});
