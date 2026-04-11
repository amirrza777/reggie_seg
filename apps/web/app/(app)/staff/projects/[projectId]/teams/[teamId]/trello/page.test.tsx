import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProjectDeadline } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import StaffTrelloSectionPage from "./page";

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

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);
const getProjectDeadlineMock = vi.mocked(getProjectDeadline);

const staffUser = { id: 88, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>;

describe("StaffTrelloSectionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders invalid-id message for non-numeric params", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);

    const page = await StaffTrelloSectionPage({ params: Promise.resolve({ projectId: "x", teamId: "y" }) });
    render(page);

    expect(screen.getByText("Invalid project or team ID.")).toBeInTheDocument();
  });

  it("renders project/team loading error", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockRejectedValue(new Error("team load failed"));

    const page = await StaffTrelloSectionPage({ params: Promise.resolve({ projectId: "21", teamId: "9" }) });
    render(page);

    expect(screen.getByText("team load failed")).toBeInTheDocument();
  });

  it("renders generic project load message when rejection is not an Error", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockRejectedValue("offline");

    const page = await StaffTrelloSectionPage({ params: Promise.resolve({ projectId: "21", teamId: "9" }) });
    render(page);

    expect(screen.getByText("Failed to load project team data.")).toBeInTheDocument();
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
