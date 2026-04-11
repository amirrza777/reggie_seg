import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import StaffTeamTrelloLayout from "./layout";

vi.mock("@/features/staff/projects/lib/staffTeamContext", () => ({
  getStaffTeamContext: vi.fn(),
}));

vi.mock("@/features/trello/context/TrelloBoardContext", () => ({
  TrelloBoardProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="staff-trello-provider">{children}</div>
  ),
}));

const getStaffTeamContextMock = vi.mocked(getStaffTeamContext);

describe("StaffTeamTrelloLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children only when staff team context fails", async () => {
    getStaffTeamContextMock.mockResolvedValue({ ok: false, error: "bad" });

    const tree = await StaffTeamTrelloLayout({
      params: Promise.resolve({ projectId: "1", teamId: "2" }),
      children: <span data-testid="child">x</span>,
    });
    render(tree);

    expect(screen.queryByTestId("staff-trello-provider")).not.toBeInTheDocument();
    expect(screen.getByTestId("child")).toHaveTextContent("x");
  });

  it("wraps children with TrelloBoardProvider when context succeeds", async () => {
    getStaffTeamContextMock.mockResolvedValue({
      ok: true,
      user: { id: 1 },
      project: {
        id: 10,
        name: "P",
        moduleId: 1,
        moduleName: "M",
        teamCount: 1,
        studentCount: 1,
      },
      team: { id: 4, teamName: "Team", projectId: 10, allocations: [] },
    } as Awaited<ReturnType<typeof getStaffTeamContext>>);

    const tree = await StaffTeamTrelloLayout({
      params: Promise.resolve({ projectId: "10", teamId: "4" }),
      children: <span data-testid="child">y</span>,
    });
    render(tree);

    expect(screen.getByTestId("staff-trello-provider")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toHaveTextContent("y");
  });
});
