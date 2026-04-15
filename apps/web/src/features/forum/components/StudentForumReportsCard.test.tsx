import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUser } from "@/features/auth/useUser";
import {
  approveStudentForumReport,
  getStaffForumConversation,
  getStudentForumReports,
  ignoreStudentForumReport,
} from "@/features/forum/api/client";
import { StudentForumReportsCard } from "./StudentForumReportsCard";
import type { StudentForumReportEntry } from "@/features/forum/types";

vi.mock("@/features/auth/useUser", () => ({
  useUser: vi.fn(),
}));

vi.mock("@/features/forum/api/client", () => ({
  getStudentForumReports: vi.fn(),
  getStaffForumConversation: vi.fn(),
  approveStudentForumReport: vi.fn(),
  ignoreStudentForumReport: vi.fn(),
}));

vi.mock("@/shared/ui/ForumConversationTree", () => ({
  ForumConversationTree: ({ focusPostId }: { focusPostId: number }) => <div>Forum thread {focusPostId}</div>,
}));

vi.mock("@/shared/ui/rich-text/RichTextViewer", () => ({
  RichTextViewer: ({ content }: { content: string }) => <span>{content}</span>,
}));

vi.mock("@/shared/ui/modal/ModalPortal", () => ({
  ModalPortal: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const useUserMock = vi.mocked(useUser);
const getStudentForumReportsMock = vi.mocked(getStudentForumReports);
const getStaffForumConversationMock = vi.mocked(getStaffForumConversation);
const approveStudentForumReportMock = vi.mocked(approveStudentForumReport);
const ignoreStudentForumReportMock = vi.mocked(ignoreStudentForumReport);

const report: StudentForumReportEntry = {
  id: 19,
  createdAt: "2026-04-12T10:00:00.000Z",
  reason: "Off-topic",
  reportCount: 2,
  post: {
    id: 33,
    title: "Reply title",
    body: "Reply body",
    createdAt: "2026-04-12T09:00:00.000Z",
    author: {
      id: 7,
      firstName: "Post",
      lastName: "Author",
      role: "STUDENT",
    },
  },
  reporter: {
    id: 5,
    firstName: "Staff",
    lastName: "Member",
    email: "staff@example.com",
    role: "STAFF",
  },
};

describe("StudentForumReportsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state and skips loading when user is missing", async () => {
    useUserMock.mockReturnValue({ user: null, loading: false } as ReturnType<typeof useUser>);

    render(<StudentForumReportsCard projectId={99} />);

    await waitFor(() => expect(screen.getByText("No pending reports.")).toBeInTheDocument());
    expect(getStudentForumReportsMock).not.toHaveBeenCalled();
  });

  it("loads reports, views conversation, and approves a report", async () => {
    useUserMock.mockReturnValue({
      user: {
        id: 5,
        firstName: "Staff",
        lastName: "Member",
        role: "STAFF",
        isStaff: true,
        isAdmin: false,
        isEnterpriseAdmin: false,
      },
      loading: false,
    } as ReturnType<typeof useUser>);
    getStudentForumReportsMock.mockResolvedValueOnce([report]);
    getStaffForumConversationMock.mockResolvedValueOnce({
      focusPostId: 33,
      missingPost: true,
      thread: {
        id: 33,
        parentPostId: null,
        title: "Thread",
        body: "Body",
        createdAt: "2026-04-12T09:00:00.000Z",
        updatedAt: "2026-04-12T09:00:00.000Z",
        author: {
          id: 7,
          firstName: "Post",
          lastName: "Author",
          role: "STUDENT",
        },
        replies: [],
      },
    });
    approveStudentForumReportMock.mockResolvedValueOnce({ ok: true });

    render(<StudentForumReportsCard projectId={99} />);

    expect(await screen.findByText("Reply title")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View conversation" }));
    await waitFor(() => expect(getStaffForumConversationMock).toHaveBeenCalledWith(5, 99, 33));
    expect(await screen.findByText("Forum thread 33")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(await screen.findByText("Approve this report and hide the post from the forum?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve report" }));

    await waitFor(() => expect(approveStudentForumReportMock).toHaveBeenCalledWith(5, 99, 19));
    expect(await screen.findByText("No pending reports.")).toBeInTheDocument();
  });

  it("supports ignore flow and surfaces action failures", async () => {
    useUserMock.mockReturnValue({
      user: {
        id: 5,
        firstName: "Staff",
        lastName: "Member",
        role: "STAFF",
        isStaff: true,
        isAdmin: false,
        isEnterpriseAdmin: false,
      },
      loading: false,
    } as ReturnType<typeof useUser>);
    getStudentForumReportsMock.mockResolvedValueOnce([report]);
    ignoreStudentForumReportMock.mockRejectedValueOnce(new Error("Ignore failed"));

    render(<StudentForumReportsCard projectId={99} />);

    expect(await screen.findByText("Reply title")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ignore" }));
    fireEvent.click(screen.getByRole("button", { name: "Ignore report" }));

    await waitFor(() => expect(ignoreStudentForumReportMock).toHaveBeenCalledWith(5, 99, 19));
    expect(await screen.findByText("Ignore failed")).toBeInTheDocument();
  });

  it("shows singular report text, handles conversation load errors, and allows hiding conversation", async () => {
    useUserMock.mockReturnValue({
      user: {
        id: 5,
        firstName: "Staff",
        lastName: "Member",
        role: "STAFF",
        isStaff: true,
        isAdmin: false,
        isEnterpriseAdmin: false,
      },
      loading: false,
    } as ReturnType<typeof useUser>);

    getStudentForumReportsMock.mockResolvedValueOnce([
      {
        ...report,
        reportCount: 1,
        reason: "",
      },
    ]);
    getStaffForumConversationMock
      .mockRejectedValueOnce("bad")
      .mockResolvedValueOnce({
        focusPostId: 33,
        missingPost: false,
        thread: {
          id: 33,
          parentPostId: null,
          title: "Thread",
          body: "Body",
          createdAt: "2026-04-12T09:00:00.000Z",
          updatedAt: "2026-04-12T09:00:00.000Z",
          author: {
            id: 7,
            firstName: "Post",
            lastName: "Author",
            role: "STUDENT",
          },
          replies: [],
        },
      });

    render(<StudentForumReportsCard projectId={99} />);
    expect(await screen.findByText("Reported by 1 student")).toBeInTheDocument();
    expect(screen.queryByText(/Reason:/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View conversation" }));
    expect(await screen.findByText("Could not load conversation.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View conversation" }));
    expect(await screen.findByText("Forum thread 33")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide conversation" }));
    expect(screen.queryByText("Forum thread 33")).not.toBeInTheDocument();
  });
});
