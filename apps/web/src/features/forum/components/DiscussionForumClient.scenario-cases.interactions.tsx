/* eslint-disable max-lines-per-function */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDiscussionPostMock,
  getDiscussionPostsMock,
  reactToDiscussionPostMock,
  setupDiscussionForumScenarioCaseDefaults,
  teardownDiscussionForumScenarioCaseDefaults,
} from "./DiscussionForumClient.scenario-cases.shared";
import { DiscussionForumClient } from "./DiscussionForumClient";

describe("DiscussionForumClient", () => {
  beforeEach(() => {
    setupDiscussionForumScenarioCaseDefaults();
  });

  afterEach(() => {
    teardownDiscussionForumScenarioCaseDefaults();
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
});
