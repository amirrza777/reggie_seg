import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProjectDeadline } from "@/features/projects/api/client";
import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import StaffTrelloGraphsPage from "./page";

vi.mock("@/features/staff/projects/lib/staffTeamContext", () => ({
  getStaffTeamContext: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getProjectDeadline: vi.fn(),
}));

vi.mock("@/features/staff/trello/StaffProjectTrelloContent", () => ({
  StaffProjectTrelloContent: (props: { teamId: number; deadline?: unknown }) => (
    <div data-testid="staff-graphs-inner">
      {props.teamId}:{props.deadline == null ? "none" : JSON.stringify(props.deadline)}
    </div>
  ),
}));

const getStaffTeamContextMock = vi.mocked(getStaffTeamContext);
const getProjectDeadlineMock = vi.mocked(getProjectDeadline);

describe("StaffTrelloGraphsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const okContext = {
    ok: true,
    user: { id: 1 },
    project: {
      id: 44,
      name: "P",
      moduleId: 2,
      moduleName: "M",
      teamCount: 1,
      studentCount: 1,
    },
    team: { id: 55, teamName: "GTeam", projectId: 44, allocations: [] },
  } as Awaited<ReturnType<typeof getStaffTeamContext>>;

  it("shows error when staff team context fails", async () => {
    getStaffTeamContextMock.mockResolvedValue({ ok: false, error: "missing" });

    const page = await StaffTrelloGraphsPage({ params: Promise.resolve({ projectId: "44", teamId: "55" }) });
    render(page);

    expect(screen.getByText("missing")).toBeInTheDocument();
  });

  it("renders graphs content and tolerates deadline load failure", async () => {
    getStaffTeamContextMock.mockResolvedValue(okContext);
    getProjectDeadlineMock.mockRejectedValue(new Error("deadline down"));

    const page = await StaffTrelloGraphsPage({ params: Promise.resolve({ projectId: "44", teamId: "55" }) });
    render(page);

    expect(getProjectDeadlineMock).toHaveBeenCalledWith(1, 44);
    expect(screen.getByTestId("staff-graphs-inner")).toHaveTextContent("55:none");
  });

  it("passes deadline into content when deadline loads", async () => {
    getStaffTeamContextMock.mockResolvedValue(okContext);
    getProjectDeadlineMock.mockResolvedValue({ taskOpenDate: "2025-01-01" } as Awaited<
      ReturnType<typeof getProjectDeadline>
    >);

    const page = await StaffTrelloGraphsPage({ params: Promise.resolve({ projectId: "44", teamId: "55" }) });
    render(page);

    expect(screen.getByTestId("staff-graphs-inner").textContent).toContain("2025-01-01");
  });
});
