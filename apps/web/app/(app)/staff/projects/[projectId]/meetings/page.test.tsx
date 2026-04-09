import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import StaffProjectMeetingsPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/staff/projects/server/getStaffProjectTeamsCached", () => ({
  getStaffProjectTeams: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);

describe("StaffProjectMeetingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders team meeting links when project data loads", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7, role: "STAFF", isStaff: true } as any);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 15, name: "Capstone", moduleId: 5, moduleName: "Internet Systems" },
      teams: [
        { id: 31, teamName: "Team Alpha", allocations: [{ userId: 1 }, { userId: 2 }] },
        { id: 32, teamName: "Team Beta", allocations: [{ userId: 3 }] },
      ],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffProjectMeetingsPage({ params: Promise.resolve({ projectId: "15" }) });
    render(page);

    const links = screen.getAllByRole("link", { name: "Open team meetings" });
    expect(links[0]).toHaveAttribute(
      "href",
      "/staff/projects/15/teams/31/team-meetings",
    );
    expect(links).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Team Beta" })).toBeInTheDocument();
  });

  it("renders empty-state when no teams exist", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7, role: "STAFF", isStaff: true } as any);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 15, name: "Capstone", moduleId: 5, moduleName: "Internet Systems" },
      teams: [],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffProjectMeetingsPage({ params: Promise.resolve({ projectId: "15" }) });
    render(page);

    expect(screen.getByText("No teams exist in this project yet.")).toBeInTheDocument();
  });
});
