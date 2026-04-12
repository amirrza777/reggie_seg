/* eslint-disable max-lines-per-function, max-statements */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { useUser } from "@/features/auth/useUser";
import { ApiError } from "@/shared/api/errors";
import {
  createDiscussionPostMock,
  createStudentForumReportMock,
  deleteDiscussionPostMock,
  getDiscussionPostsMock,
  makePost,
  reactToDiscussionPostMock,
  reportDiscussionPostMock,
  setupDiscussionForumScenarioCaseDefaults,
  teardownDiscussionForumScenarioCaseDefaults,
  updateDiscussionPostMock,
  useUserMock,
} from "./DiscussionForumClient.scenario-cases.shared";
import { DiscussionForumClient } from "./DiscussionForumClient";

describe("DiscussionForumClient", () => {
  beforeEach(() => {
    setupDiscussionForumScenarioCaseDefaults();
  });

  afterEach(() => {
    teardownDiscussionForumScenarioCaseDefaults();
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

  it("uses id as a final tie-breaker when reply score and timestamp are equal", async () => {
    getDiscussionPostsMock.mockResolvedValue([
      makePost({
        id: 42,
        body: "Tie breaker root",
        replies: [
          makePost({
            id: 302,
            parentPostId: 42,
            title: "",
            body: "Later id reply",
            reactionScore: 5,
            createdAt: "2026-03-22T10:30:00.000Z",
            updatedAt: "2026-03-22T10:30:00.000Z",
          }),
          makePost({
            id: 301,
            parentPostId: 42,
            title: "",
            body: "Earlier id reply",
            reactionScore: 5,
            createdAt: "2026-03-22T10:30:00.000Z",
            updatedAt: "2026-03-22T10:30:00.000Z",
          }),
        ],
      }),
    ]);

    render(<DiscussionForumClient projectId="9" />);
    await waitFor(() => expect(getDiscussionPostsMock).toHaveBeenCalledWith(1, 9));

    fireEvent.click(screen.getByRole("button", { name: "Show replies (2)" }));

    const replyBodies = screen.getAllByText(/id reply$/i).map((node) => node.textContent);
    expect(replyBodies).toEqual(["Earlier id reply", "Later id reply"]);
  });

  it("handles a non-element pointerdown target by closing the post menu", async () => {
    getDiscussionPostsMock.mockResolvedValue([
      makePost({
        id: 951,
        body: "Pointer target post",
        author: { id: 1, firstName: "Ayan", lastName: "Mamun", role: "STUDENT" },
      }),
    ]);

    const addEventListenerSpy = vi.spyOn(document, "addEventListener");
    render(<DiscussionForumClient projectId="9" />);
    await waitFor(() => expect(getDiscussionPostsMock).toHaveBeenCalledWith(1, 9));

    const article = screen.getByText("Pointer target post").closest("article") as HTMLElement;
    fireEvent.click(within(article).getByRole("button", { name: "Post actions" }));
    expect(within(article).getByRole("button", { name: "Edit" })).toBeInTheDocument();

    const pointerListenerEntry = addEventListenerSpy.mock.calls.find(([eventName]) => eventName === "pointerdown");
    const pointerListener = pointerListenerEntry?.[1] as ((event: PointerEvent) => void) | undefined;
    expect(pointerListener).toBeDefined();
    act(() => {
      pointerListener?.({ target: null } as unknown as PointerEvent);
    });

    await waitFor(() => {
      expect(within(article).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    });
    addEventListenerSpy.mockRestore();
  });

  it("respects loading state without fetching posts until the user context resolves", () => {
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
      loading: true,
    } as ReturnType<typeof useUser>);

    render(<DiscussionForumClient projectId="9" />);
    expect(getDiscussionPostsMock).not.toHaveBeenCalled();
  });

  it("surfaces update, delete, report, reaction, and reply errors", async () => {
    getDiscussionPostsMock.mockResolvedValue([
      makePost({
        id: 960,
        body: "Owned body",
        author: { id: 1, firstName: "Ayan", lastName: "Mamun", role: "STUDENT" },
      }),
      makePost({
        id: 961,
        body: "Other body",
        author: { id: 2, firstName: "Other", lastName: "Student", role: "STUDENT" },
      }),
    ]);
    updateDiscussionPostMock.mockRejectedValueOnce(new Error("update boom"));
    deleteDiscussionPostMock.mockRejectedValueOnce(new Error("delete boom"));
    createStudentForumReportMock.mockRejectedValueOnce(new Error("student report boom"));
    createDiscussionPostMock.mockRejectedValueOnce(new Error("reply boom"));
    reactToDiscussionPostMock.mockRejectedValueOnce(new Error("reaction boom"));
    reactToDiscussionPostMock.mockRejectedValueOnce(new ApiError("Forbidden", { status: 403 }));

    render(<DiscussionForumClient projectId="9" />);
    await waitFor(() => expect(getDiscussionPostsMock).toHaveBeenCalledWith(1, 9));

    const ownedArticle = screen.getByText("Owned body").closest("article") as HTMLElement;
    fireEvent.click(within(ownedArticle).getByRole("button", { name: "Post actions" }));
    fireEvent.click(within(ownedArticle).getByRole("button", { name: "Edit" }));
    fireEvent.change(within(ownedArticle).getByLabelText("Title"), { target: { value: "Owned update" } });
    fireEvent.change(within(ownedArticle).getAllByRole("textbox")[1], { target: { value: "Owned body edited" } });
    fireEvent.click(within(ownedArticle).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByText("Failed to update post.")).toBeInTheDocument());

    fireEvent.click(within(ownedArticle).getByRole("button", { name: "Cancel" }));
    fireEvent.click(within(ownedArticle).getByRole("button", { name: "Post actions" }));
    fireEvent.click(within(ownedArticle).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.getByText("Failed to delete post.")).toBeInTheDocument());

    const otherArticle = screen.getByText("Other body").closest("article") as HTMLElement;
    fireEvent.click(within(otherArticle).getByRole("button", { name: "Post actions" }));
    fireEvent.click(within(otherArticle).getByRole("button", { name: "Report" }));
    fireEvent.click(screen.getByRole("button", { name: "Report post" }));
    await waitFor(() => expect(screen.getByText("Failed to report post.")).toBeInTheDocument());

    fireEvent.click(within(otherArticle).getByRole("button", { name: "Like post" }));
    await waitFor(() => expect(screen.getByText("Failed to update reaction.")).toBeInTheDocument());

    fireEvent.click(within(otherArticle).getByRole("button", { name: "Dislike post" }));
    await waitFor(() => expect(reactToDiscussionPostMock).toHaveBeenLastCalledWith(1, 9, 961, "DISLIKE"));

    fireEvent.click(within(otherArticle).getByRole("button", { name: "Post actions" }));
    fireEvent.click(within(otherArticle).getByRole("button", { name: "Reply" }));
    fireEvent.change(within(otherArticle).getByPlaceholderText("Write a reply"), { target: { value: "Reply draft" } });
    fireEvent.click(within(otherArticle).getByRole("button", { name: "Post reply" }));
    await waitFor(() => expect(screen.getByText("Failed to add reply.")).toBeInTheDocument());
  });

  it("supports editing and deleting nested replies and can recurse report updates", async () => {
    getDiscussionPostsMock.mockResolvedValue([
      makePost({
        id: 1000,
        body: "Deep root",
        author: { id: 2, firstName: "Other", lastName: "Student", role: "STUDENT" },
        replies: [
          makePost({
            id: 1001,
            parentPostId: 1000,
            title: "",
            body: "First nested",
            author: { id: 2, firstName: "Other", lastName: "Student", role: "STUDENT" },
            replies: [
              makePost({
                id: 1002,
                parentPostId: 1001,
                title: "",
                body: "Second nested",
                author: { id: 1, firstName: "Ayan", lastName: "Mamun", role: "STUDENT" },
                replies: [
                  makePost({
                    id: 1003,
                    parentPostId: 1002,
                    title: "",
                    body: "Third nested",
                    author: { id: 2, firstName: "Other", lastName: "Student", role: "STUDENT" },
                    replies: [],
                  }),
                ],
              }),
            ],
          }),
          makePost({
            id: 1004,
            parentPostId: 1000,
            title: "",
            body: "Sibling nested",
            author: { id: 2, firstName: "Other", lastName: "Student", role: "STUDENT" },
            replies: [
              makePost({
                id: 1006,
                parentPostId: 1004,
                title: "",
                body: "Sibling branch child",
                author: { id: 2, firstName: "Other", lastName: "Student", role: "STUDENT" },
                replies: [],
              }),
            ],
          }),
        ],
      }),
    ]);

    updateDiscussionPostMock.mockResolvedValueOnce(
      makePost({
        id: 1002,
        parentPostId: 1001,
        title: "",
        body: "Second nested edited",
        author: { id: 1, firstName: "Ayan", lastName: "Mamun", role: "STUDENT" },
        replies: [
          makePost({
            id: 1003,
            parentPostId: 1002,
            title: "",
            body: "Third nested",
            author: { id: 2, firstName: "Other", lastName: "Student", role: "STUDENT" },
            replies: [],
          }),
        ],
      })
    );
    deleteDiscussionPostMock.mockResolvedValueOnce(undefined as never);
    createStudentForumReportMock.mockResolvedValueOnce({} as never);
    createDiscussionPostMock.mockResolvedValueOnce(
      makePost({
        id: 1005,
        parentPostId: 1003,
        title: "",
        body: "Fourth nested",
        author: { id: 1, firstName: "Ayan", lastName: "Mamun", role: "STUDENT" },
        replies: [],
      })
    );

    render(<DiscussionForumClient projectId="9" />);
    await waitFor(() => expect(getDiscussionPostsMock).toHaveBeenCalledWith(1, 9));

    fireEvent.click(screen.getByRole("button", { name: "Show replies (2)" }));

    const firstNestedArticle = screen.getByText("First nested").closest("article") as HTMLElement;
    fireEvent.click(within(firstNestedArticle).getByRole("button", { name: "Show replies (1)" }));

    const secondNestedArticle = screen.getByText("Second nested").closest("article") as HTMLElement;
    fireEvent.click(within(secondNestedArticle).getByRole("button", { name: "Show replies (1)" }));

    fireEvent.click(within(secondNestedArticle).getAllByRole("button", { name: "Post actions" })[0]);
    fireEvent.click(within(secondNestedArticle).getByRole("button", { name: "Edit" }));
    expect(within(secondNestedArticle).queryByLabelText("Title")).not.toBeInTheDocument();
    fireEvent.change(within(secondNestedArticle).getByRole("textbox"), { target: { value: "Second nested edited" } });
    fireEvent.click(within(secondNestedArticle).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByText("Second nested edited")).toBeInTheDocument());

    const thirdNestedArticle = screen.getByText("Third nested").closest("article") as HTMLElement;
    fireEvent.click(within(thirdNestedArticle).getAllByRole("button", { name: "Post actions" })[0]);
    fireEvent.click(within(thirdNestedArticle).getByRole("button", { name: "Reply" }));
    fireEvent.change(within(thirdNestedArticle).getByPlaceholderText("Write a reply"), { target: { value: "Fourth nested" } });
    fireEvent.click(within(thirdNestedArticle).getByRole("button", { name: "Post reply" }));
    await waitFor(() => expect(screen.getByText("Fourth nested")).toBeInTheDocument());

    fireEvent.click(within(thirdNestedArticle).getAllByRole("button", { name: "Post actions" })[0]);
    fireEvent.click(within(thirdNestedArticle).getByRole("button", { name: "Report" }));
    fireEvent.click(screen.getByRole("button", { name: "Report post" }));
    await waitFor(() => expect(screen.getByText("Reported")).toBeInTheDocument());

    fireEvent.click(within(secondNestedArticle).getAllByRole("button", { name: "Post actions" })[0]);
    fireEvent.click(within(secondNestedArticle).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByText("Second nested edited")).not.toBeInTheDocument());
  });

  it("shows staff report errors when moderation calls fail", async () => {
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
    getDiscussionPostsMock.mockResolvedValue([
      makePost({
        id: 1100,
        body: "Moderation target",
        author: { id: 2, firstName: "Other", lastName: "Student", role: "STUDENT" },
      }),
    ]);
    reportDiscussionPostMock.mockRejectedValueOnce(new Error("staff-report boom"));

    render(<DiscussionForumClient projectId="9" />);
    await waitFor(() => expect(getDiscussionPostsMock).toHaveBeenCalledWith(3, 9));

    const targetArticle = screen.getByText("Moderation target").closest("article") as HTMLElement;
    fireEvent.click(within(targetArticle).getByRole("button", { name: "Post actions" }));
    fireEvent.click(within(targetArticle).getByRole("button", { name: "Report" }));
    fireEvent.click(screen.getByRole("button", { name: "Report post" }));

    await waitFor(() => expect(screen.getByText("Failed to report post.")).toBeInTheDocument());
  });

  it("toggles menu open state and switches reply action label", async () => {
    getDiscussionPostsMock.mockResolvedValue([
      makePost({
        id: 1200,
        body: "Menu toggle post",
        author: { id: 2, firstName: "Other", lastName: "Student", role: "STUDENT" },
      }),
    ]);

    render(<DiscussionForumClient projectId="9" />);
    await waitFor(() => expect(getDiscussionPostsMock).toHaveBeenCalledWith(1, 9));

    const article = screen.getByText("Menu toggle post").closest("article") as HTMLElement;
    const trigger = within(article).getByRole("button", { name: "Post actions" });

    fireEvent.click(trigger);
    expect(within(article).getByRole("button", { name: "Reply" })).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(within(article).queryByRole("button", { name: "Reply" })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.click(within(article).getByRole("button", { name: "Reply" }));
    expect(within(article).getByPlaceholderText("Write a reply")).toBeInTheDocument();

    fireEvent.click(within(article).getByRole("button", { name: "Post actions" }));
    fireEvent.click(within(article).getByRole("button", { name: "Cancel reply" }));
    expect(within(article).queryByPlaceholderText("Write a reply")).not.toBeInTheDocument();
  });
});
