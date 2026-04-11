import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import StaffTrelloBoardPage from "./page";

vi.mock("@/features/staff/projects/lib/staffTeamContext", () => ({
  getStaffTeamContext: vi.fn(),
}));

vi.mock("@/features/staff/trello/StaffProjectTrelloContent", () => ({
  StaffProjectTrelloContent: (props: { teamId: number; viewExtraProps?: { filterVariant?: string } }) => (
    <div data-testid="staff-board-inner">
      {props.teamId}:{props.viewExtraProps?.filterVariant ?? "none"}
    </div>
  ),
}));

const getStaffTeamContextMock = vi.mocked(getStaffTeamContext);

describe("StaffTrelloBoardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows error when staff team context fails", async () => {
    getStaffTeamContextMock.mockResolvedValue({ ok: false, error: "No access" });

    const page = await StaffTrelloBoardPage({ params: Promise.resolve({ projectId: "1", teamId: "2" }) });
    render(page);

    expect(screen.getByText("No access")).toBeInTheDocument();
    expect(screen.queryByTestId("staff-board-inner")).not.toBeInTheDocument();
  });

  it("renders board content when context succeeds", async () => {
    getStaffTeamContextMock.mockResolvedValue({
      ok: true,
      user: { id: 1 },
      project: {
        id: 1,
        name: "P",
        moduleId: 1,
        moduleName: "M",
        teamCount: 1,
        studentCount: 1,
      },
      team: { id: 9, teamName: "Alpha", projectId: 1, allocations: [] },
    } as Awaited<ReturnType<typeof getStaffTeamContext>>);

    const page = await StaffTrelloBoardPage({ params: Promise.resolve({ projectId: "1", teamId: "9" }) });
    render(page);

    expect(screen.getByTestId("staff-board-inner")).toHaveTextContent("9:staff");
  });
});
