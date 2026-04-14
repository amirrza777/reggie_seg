import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForumReportsTable } from "./ForumReportsTable";
import {
  dismissForumReport,
  getForumReportConversation,
  getForumReports,
  removeForumReportPost,
} from "../api/client";
import type { ForumReportEntry } from "../types";

vi.mock("../api/client", () => ({
  getForumReports: vi.fn(),
  dismissForumReport: vi.fn(),
  getForumReportConversation: vi.fn(),
  removeForumReportPost: vi.fn(),
}));

vi.mock("@/shared/ui/ForumConversationTree", () => ({
  ForumConversationTree: ({ focusPostId }: { focusPostId: number }) => <div>Conversation tree {focusPostId}</div>,
}));

vi.mock("@/shared/ui/rich-text/RichTextViewer", () => ({
  RichTextViewer: ({ content }: { content: string }) => <span>{content}</span>,
}));

vi.mock("@/shared/ui/modal/ModalPortal", () => ({
  ModalPortal: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const getForumReportsMock = vi.mocked(getForumReports);
const dismissForumReportMock = vi.mocked(dismissForumReport);
const getForumReportConversationMock = vi.mocked(getForumReportConversation);
const removeForumReportPostMock = vi.mocked(removeForumReportPost);

const report: ForumReportEntry = {
  id: 12,
  createdAt: "2026-04-12T10:00:00.000Z",
  reason: "Spam",
  title: "Reported post title",
  body: "Reported post body",
  postId: 77,
  project: { id: 4, name: "Project Mercury", module: { name: "CS3001" } },
  reporter: {
    id: 8,
    email: "reporter@example.com",
    firstName: "Re",
    lastName: "Porter",
    role: "STUDENT",
  },
  author: {
    id: 11,
    email: "author@example.com",
    firstName: "Au",
    lastName: "Thor",
    role: "STUDENT",
  },
};

describe("ForumReportsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads reports, views conversation, and dismisses a report", async () => {
    getForumReportsMock.mockResolvedValueOnce([report]);
    getForumReportConversationMock.mockResolvedValueOnce({
      focusPostId: 77,
      missingPost: false,
      thread: {
        id: 77,
        parentPostId: null,
        title: "Thread",
        body: "Body",
        createdAt: "2026-04-12T09:00:00.000Z",
        updatedAt: "2026-04-12T09:00:00.000Z",
        author: {
          id: 11,
          email: "author@example.com",
          firstName: "Au",
          lastName: "Thor",
          role: "STUDENT",
        },
        replies: [],
      },
    });
    dismissForumReportMock.mockResolvedValueOnce({ ok: true });

    render(<ForumReportsTable />);

    expect(await screen.findByText("Reported post title")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View conversation" }));
    await waitFor(() => expect(getForumReportConversationMock).toHaveBeenCalledWith(12));
    expect(await screen.findByText("Conversation tree 77")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss report" }));
    expect(await screen.findByText("Dismiss this report and restore the post?")).toBeInTheDocument();

    const confirmDismissButtons = screen.getAllByRole("button", { name: "Dismiss report" });
    fireEvent.click(confirmDismissButtons[confirmDismissButtons.length - 1]);

    await waitFor(() => expect(dismissForumReportMock).toHaveBeenCalledWith(12));
    expect(screen.queryByText("Reported post title")).not.toBeInTheDocument();
  });

  it("shows load errors", async () => {
    getForumReportsMock.mockRejectedValueOnce(new Error("Could not fetch reports"));
    render(<ForumReportsTable />);
    expect(await screen.findByText("Could not fetch reports")).toBeInTheDocument();
  });

  it("supports remove confirmation flow", async () => {
    getForumReportsMock.mockResolvedValueOnce([report]);
    removeForumReportPostMock.mockResolvedValueOnce({ ok: true });

    render(<ForumReportsTable />);

    expect(await screen.findByText("Reported post title")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(await screen.findByText("Permanently remove this post from the database? This cannot be undone.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove post" }));
    await waitFor(() => expect(removeForumReportPostMock).toHaveBeenCalledWith(12));
  });

  it("shows remove failure messages", async () => {
    getForumReportsMock.mockResolvedValueOnce([report]);
    removeForumReportPostMock.mockRejectedValueOnce(new Error("Remove failed"));

    render(<ForumReportsTable />);
    expect(await screen.findByText("Reported post title")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(await screen.findByText("Permanently remove this post from the database? This cannot be undone.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove post" }));
    await waitFor(() => expect(screen.getByText("Remove failed")).toBeInTheDocument());
  });
});
