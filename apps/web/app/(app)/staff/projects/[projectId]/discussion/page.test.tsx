import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getForumMembers, getForumSettings } from "@/features/forum/api/client";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { getCurrentUser } from "@/shared/auth/session";
import StaffProjectDiscussionPage from "./page";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/staff/projects/server/getStaffProjectTeamsCached", () => ({
  getStaffProjectTeams: vi.fn(),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/forum/api/client", () => ({
  getForumMembers: vi.fn(),
  getForumSettings: vi.fn(),
}));

vi.mock("@/features/forum/components/StudentForumReportsCard", () => ({
  StudentForumReportsCard: ({ projectId }: { projectId: number }) => (
    <div data-testid="reports-card" data-project-id={String(projectId)} />
  ),
}));

vi.mock("@/features/forum/components/DiscussionForumClient", () => ({
  DiscussionForumClient: ({ projectId, members }: { projectId: string; members: unknown[] }) => (
    <div data-testid="discussion-client" data-project-id={projectId} data-members={members.length} />
  ),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);
const getForumMembersMock = vi.mocked(getForumMembers);
const getForumSettingsMock = vi.mocked(getForumSettings);

describe("StaffProjectDiscussionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 9 } as any);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 22, name: "Project", moduleId: 5 },
      teams: [{ id: 58, teamName: "Team 58", allocations: [] }],
    } as any);
    getForumMembersMock.mockResolvedValue([{ id: 1 }, { id: 2 }] as any);
    getForumSettingsMock.mockResolvedValue({ forumIsAnonymous: true } as any);
  });

  it("renders anonymous forum privacy details and plural member count", async () => {
    const page = await StaffProjectDiscussionPage({
      params: Promise.resolve({ projectId: "22" }),
    });
    render(page);

    expect(getStaffProjectTeamsMock).toHaveBeenCalledWith(9, 22);
    expect(screen.getByText("2 forum participants")).toBeInTheDocument();
    expect(screen.getByText("Posts on the forum are anonymous and not linked to students.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Change" })).toHaveAttribute("href", "/staff/projects/22/manage");
    expect(screen.getByTestId("reports-card")).toHaveAttribute("data-project-id", "22");
    expect(screen.getByTestId("discussion-client")).toHaveAttribute("data-members", "2");
  });

  it("renders named privacy details and singular member count", async () => {
    getForumMembersMock.mockResolvedValueOnce([{ id: 1 }] as any);
    getForumSettingsMock.mockResolvedValueOnce({ forumIsAnonymous: false } as any);

    const page = await StaffProjectDiscussionPage({
      params: Promise.resolve({ projectId: "22" }),
    });
    render(page);

    expect(screen.getByText("1 forum participant")).toBeInTheDocument();
    expect(screen.getByText("Student names are visible on posts.")).toBeInTheDocument();
  });

  it("falls back gracefully when members/settings loaders fail", async () => {
    getForumMembersMock.mockRejectedValueOnce(new Error("members down"));
    getForumSettingsMock.mockRejectedValueOnce(new Error("settings down"));

    const page = await StaffProjectDiscussionPage({
      params: Promise.resolve({ projectId: "22" }),
    });
    render(page);

    expect(screen.getByText("0 forum participants")).toBeInTheDocument();
    expect(
      screen.getByText("Forum privacy could not be loaded. You can still change it in project settings."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("discussion-client")).toHaveAttribute("data-members", "0");
  });
});

