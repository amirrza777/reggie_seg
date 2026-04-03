import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getProjectDeadline } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import StaffTrelloSectionPage from "./page";

class RedirectSentinel extends Error {
  constructor(readonly path: string) {
    super(path);
  }
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectSentinel(path);
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className, ...props }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/staff/projects/server/getStaffProjectTeamsCached", () => ({
  getStaffProjectTeams: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getProjectDeadline: vi.fn(),
}));

vi.mock("@/features/staff/trello/StaffProjectTrelloContent", () => ({
  StaffProjectTrelloContent: ({
    projectId,
    teamId,
    moduleId,
    teamName,
    deadline,
  }: {
    projectId: string;
    teamId: number;
    moduleId: number;
    teamName: string;
    deadline?: unknown;
  }) => (
    <div data-testid="staff-trello-content">
      {`${projectId}:${teamId}:${moduleId}:${teamName}:${String(deadline ?? "none")}`}
    </div>
  ),
}));

vi.mock("@/features/staff/trello/StaffTrelloSummaryView", () => ({
  StaffTrelloSummaryView: () => <div>summary-view</div>,
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);
const getProjectDeadlineMock = vi.mocked(getProjectDeadline);

const staffUser = { id: 88, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>;

describe("StaffTrelloSectionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects users without staff/admin access", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 2, isStaff: false, role: "STUDENT" } as Awaited<ReturnType<typeof getCurrentUser>>);

    await expect(
      StaffTrelloSectionPage({ params: Promise.resolve({ projectId: "10", teamId: "11" }) }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders invalid-id message for non-numeric params", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);

    const page = await StaffTrelloSectionPage({ params: Promise.resolve({ projectId: "x", teamId: "y" }) });
    render(page);

    expect(screen.getByText("Invalid project or team ID.")).toBeInTheDocument();
  });

  it("renders project/team loading error and back link", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockRejectedValue(new Error("team load failed"));

    const page = await StaffTrelloSectionPage({ params: Promise.resolve({ projectId: "21", teamId: "9" }) });
    render(page);

    expect(screen.getByText("team load failed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to project teams" })).toHaveAttribute("href", "/staff/projects/21");
  });

  it("renders missing-team fallback when team id is not in project", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 12, moduleId: 5, name: "Project A" },
      teams: [{ id: 99, teamName: "Another Team" }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffTrelloSectionPage({ params: Promise.resolve({ projectId: "12", teamId: "7" }) });
    render(page);

    expect(screen.getByText("Team not found in this project.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to project teams" })).toHaveAttribute("href", "/staff/projects/12");
  });

  it("renders trello content and tolerates deadline API failure", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 44, moduleId: 3, name: "Project B" },
      teams: [{ id: 55, teamName: "Team B" }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getProjectDeadlineMock.mockRejectedValue(new Error("deadline unavailable"));

    const page = await StaffTrelloSectionPage({ params: Promise.resolve({ projectId: "44", teamId: "55" }) });
    render(page);

    expect(getProjectDeadlineMock).toHaveBeenCalledWith(88, 44);
    expect(screen.getByTestId("staff-trello-content")).toHaveTextContent("44:55:3:Team B:none");
  });
});
