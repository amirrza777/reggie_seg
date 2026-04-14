/* eslint-disable max-lines-per-function */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { useUser } from "@/features/auth/useUser";
import {
  createDiscussionPostMock,
  createStudentForumReportMock,
  deleteDiscussionPostMock,
  getDiscussionPostsMock,
  makePost,
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

  it("ignores composer submit attempts when no authenticated user is available", () => {
    useUserMock.mockReturnValue({
      user: null,
      loading: false,
    } as ReturnType<typeof useUser>);
    getDiscussionPostsMock.mockResolvedValue([]);

    render(<DiscussionForumClient projectId="9" />);

    const composerForm = screen.getByLabelText("Title").closest("form");
    expect(composerForm).not.toBeNull();
    fireEvent.submit(composerForm as HTMLFormElement);

    expect(createDiscussionPostMock).not.toHaveBeenCalled();
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
    await waitFor(() => {
      expect(screen.getByText("Edited body")).toBeInTheDocument();
      expect(screen.getByText("Module Lead")).toBeInTheDocument();
      expect(screen.getByText(/Edited:/)).toBeInTheDocument();
    });
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

    act(() => {
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    });
    await waitFor(() => {
      expect(within(article).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    });
  });
});
