import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import StaffRepositoriesSectionPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/staff/projects/server/getStaffProjectTeamsCached", () => ({
  getStaffProjectTeams: vi.fn(),
}));

vi.mock("@/features/github/components/StaffProjectReposReadOnlyClient", () => ({
  StaffProjectReposReadOnlyClient: ({
    projectId,
    projectName,
    teamName,
  }: {
    projectId: string;
    projectName: string;
    teamName: string;
  }) => (
    <div data-testid="repos-client" data-project-id={projectId} data-project-name={projectName} data-team-name={teamName} />
  ),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);

describe("StaffRepositoriesSectionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows invalid id message for non-numeric route params", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 2, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);

    const page = await StaffRepositoriesSectionPage({
      params: Promise.resolve({ projectId: "x", teamId: "y" }),
    });
    render(page);

    expect(screen.getByText("Invalid project or team ID.")).toBeInTheDocument();
  });

  it("shows fallback error when project teams cannot be loaded", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 3, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStaffProjectTeamsMock.mockRejectedValue(new Error("unable to load teams"));

    const page = await StaffRepositoriesSectionPage({
      params: Promise.resolve({ projectId: "8", teamId: "4" }),
    });
    render(page);

    expect(screen.getByText("unable to load teams")).toBeInTheDocument();
  });

  it("shows team-not-found message when team id is missing from project data", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 4, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 12, name: "Project Atlas", moduleId: 99 },
      teams: [{ id: 6, teamName: "Existing team" }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffRepositoriesSectionPage({
      params: Promise.resolve({ projectId: "12", teamId: "77" }),
    });
    render(page);

    expect(screen.getByText("Team not found in this project.")).toBeInTheDocument();
  });

  it("renders team repository context when team exists", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 9, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 15, name: "Project Nova", moduleId: 33 },
      teams: [{ id: 44, teamName: "Team Luna" }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffRepositoriesSectionPage({
      params: Promise.resolve({ projectId: "15", teamId: "44" }),
    });
    render(page);

    expect(screen.getByTestId("repos-client")).toHaveAttribute("data-project-name", "Project Nova");
    expect(screen.getByTestId("repos-client")).toHaveAttribute("data-team-name", "Team Luna");
  });
});
