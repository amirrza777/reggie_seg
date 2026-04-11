import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import StaffProjectTeamsPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/staff/projects/server/getStaffProjectTeamsCached", () => ({
  getStaffProjectTeams: vi.fn(),
}));

vi.mock("@/features/staff/projects/components/StaffTeamCard", () => ({
  StaffTeamCard: ({ team }: { team: { teamName: string } }) => <div data-testid="team-card">{team.teamName}</div>,
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getTeamsMock = vi.mocked(getStaffProjectTeams);

describe("StaffProjectTeamsPage (project overview)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 1, isStaff: true } as Awaited<ReturnType<typeof getCurrentUser>>);
  });

  it("lists team cards when teams exist", async () => {
    getTeamsMock.mockResolvedValue({
      project: { id: 3, name: "P", moduleId: 1 },
      teams: [{ id: 10, teamName: "Alpha", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    const page = await StaffProjectTeamsPage({ params: Promise.resolve({ projectId: "3" }) });
    render(page);
    expect(screen.getByTestId("team-card")).toHaveTextContent("Alpha");
  });

  it("shows empty copy when there are no teams", async () => {
    getTeamsMock.mockResolvedValue({
      project: { id: 3, name: "P", moduleId: 1 },
      teams: [],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    const page = await StaffProjectTeamsPage({ params: Promise.resolve({ projectId: "3" }) });
    render(page);
    expect(screen.getByText(/No teams exist in this project yet/i)).toBeInTheDocument();
  });
});
