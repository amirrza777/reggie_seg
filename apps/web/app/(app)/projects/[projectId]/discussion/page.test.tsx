import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/shared/auth/session";
import { getProject, getTeamByUserAndProject } from "@/features/projects/api/client";
import { getForumMembers } from "@/features/forum/api/client";
import ProjectDiscussionPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getProject: vi.fn(),
  getTeamByUserAndProject: vi.fn(),
}));

vi.mock("@/features/forum/api/client", () => ({
  getForumMembers: vi.fn(),
}));

vi.mock("@/features/forum/components/DiscussionForumClient", () => ({
  DiscussionForumClient: ({ projectId, members }: { projectId: string; members: unknown[] }) => (
    <div data-testid="discussion-client" data-project-id={projectId} data-members={members.length} />
  ),
}));

vi.mock("@/features/projects/components/CustomAllocationWaitingBoard", () => ({
  CustomAllocationWaitingBoard: ({ projectId }: { projectId: string }) => (
    <div data-testid="allocation-board" data-project-id={projectId} />
  ),
}));

vi.mock("@/shared/ui/PageSection", () => ({
  PageSection: ({ children }: { children: React.ReactNode }) => <section data-testid="page-section">{children}</section>,
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getTeamByUserAndProjectMock = vi.mocked(getTeamByUserAndProject);
const getProjectMock = vi.mocked(getProject);
const getForumMembersMock = vi.mocked(getForumMembers);

describe("ProjectDiscussionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 7 } as any);
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 1 } as any);
    getProjectMock.mockResolvedValue({ teamAllocationQuestionnaireTemplateId: null } as any);
    getForumMembersMock.mockResolvedValue([{ id: 1 }] as any);
  });

  it("renders custom allocation board when team is missing and project requires allocation", async () => {
    getTeamByUserAndProjectMock.mockResolvedValueOnce(null as any);
    getProjectMock.mockResolvedValueOnce({ teamAllocationQuestionnaireTemplateId: 91 } as any);

    const page = await ProjectDiscussionPage({ params: Promise.resolve({ projectId: "42" }) });
    render(page);

    expect(screen.getByTestId("page-section")).toBeInTheDocument();
    expect(screen.getByTestId("allocation-board")).toHaveAttribute("data-project-id", "42");
  });

  it("renders discussion client with fetched members by default", async () => {
    const page = await ProjectDiscussionPage({ params: Promise.resolve({ projectId: "42" }) });
    render(page);

    expect(getForumMembersMock).toHaveBeenCalledWith(7, 42);
    expect(screen.getByTestId("discussion-client")).toHaveAttribute("data-project-id", "42");
    expect(screen.getByTestId("discussion-client")).toHaveAttribute("data-members", "1");
  });

  it("handles lookup failures and unauthenticated users gracefully", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null as any);
    getForumMembersMock.mockRejectedValueOnce(new Error("down"));

    const page = await ProjectDiscussionPage({ params: Promise.resolve({ projectId: "invalid" }) });
    render(page);

    expect(getTeamByUserAndProjectMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("discussion-client")).toHaveAttribute("data-members", "0");
  });

  it("falls back to discussion client when team lookup and project lookup fail", async () => {
    getTeamByUserAndProjectMock.mockRejectedValueOnce(new Error("team lookup failed"));
    getProjectMock.mockRejectedValueOnce(new Error("project lookup failed"));

    const page = await ProjectDiscussionPage({ params: Promise.resolve({ projectId: "42" }) });
    render(page);

    expect(screen.getByTestId("discussion-client")).toBeInTheDocument();
    expect(screen.queryByTestId("allocation-board")).not.toBeInTheDocument();
  });

  it("uses empty members list when forum member fetch fails for authenticated users", async () => {
    getForumMembersMock.mockRejectedValueOnce(new Error("members down"));

    const page = await ProjectDiscussionPage({ params: Promise.resolve({ projectId: "42" }) });
    render(page);

    expect(getForumMembersMock).toHaveBeenCalledWith(7, 42);
    expect(screen.getByTestId("discussion-client")).toHaveAttribute("data-members", "0");
  });
});
