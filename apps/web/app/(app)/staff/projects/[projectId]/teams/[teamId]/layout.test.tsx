import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import StaffTeamLayout from "./layout";

vi.mock("@/features/staff/projects/lib/staffTeamContext", () => ({
  getStaffTeamContext: vi.fn(),
}));

vi.mock("@/features/staff/projects/components/navigation/StaffTeamSectionNav", () => ({
  StaffTeamSectionNav: ({
    projectId,
    teamId,
    moduleId,
  }: {
    projectId: string;
    teamId: string;
    moduleId: number;
  }) => (
    <div data-testid="team-nav" data-project-id={projectId} data-team-id={teamId} data-module-id={String(moduleId)} />
  ),
}));

const getStaffTeamContextMock = vi.mocked(getStaffTeamContext);

describe("StaffTeamLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders context error when team context cannot be resolved", async () => {
    getStaffTeamContextMock.mockResolvedValueOnce({
      ok: false,
      error: "Team context failed",
    } as any);

    const page = await StaffTeamLayout({
      params: Promise.resolve({ projectId: "22", teamId: "58" }),
      children: <div>child</div>,
    });
    render(page);

    expect(screen.getByText("Team context failed")).toBeInTheDocument();
    expect(screen.queryByTestId("team-nav")).not.toBeInTheDocument();
  });

  it("renders section nav and children when context is available", async () => {
    getStaffTeamContextMock.mockResolvedValueOnce({
      ok: true,
      project: { id: 22, moduleId: 5 },
      team: { id: 58, teamName: "Team 58" },
    } as any);

    const page = await StaffTeamLayout({
      params: Promise.resolve({ projectId: "22", teamId: "58" }),
      children: <div data-testid="layout-child">child</div>,
    });
    render(page);

    expect(screen.getByTestId("team-nav")).toHaveAttribute("data-project-id", "22");
    expect(screen.getByTestId("team-nav")).toHaveAttribute("data-team-id", "58");
    expect(screen.getByTestId("team-nav")).toHaveAttribute("data-module-id", "5");
    expect(screen.getByTestId("layout-child")).toBeInTheDocument();
  });
});

