import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffManualAllocationPanel } from "./StaffManualAllocationPanel";
import { getManualAllocationWorkspace } from "@/features/projects/api/teamAllocation";

vi.mock("@/features/projects/api/teamAllocation", () => ({
  getManualAllocationWorkspace: vi.fn(),
}));

describe("StaffManualAllocationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads workspace on open and shows summary badges", async () => {
    (getManualAllocationWorkspace as any).mockResolvedValue({
      project: { id: 4, name: "Project A", moduleId: 11, moduleName: "Module A" },
      existingTeams: [],
      students: [
        {
          id: 10,
          firstName: "Jin",
          lastName: "Johannesdottir",
          email: "jin@example.com",
          status: "ALREADY_IN_TEAM",
          currentTeam: { id: 7, teamName: "Team Alpha" },
        },
        {
          id: 11,
          firstName: "Pricha",
          lastName: "Lee",
          email: "pricha@example.com",
          status: "AVAILABLE",
          currentTeam: null,
        },
      ],
      counts: {
        totalStudents: 12,
        availableStudents: 8,
        alreadyInTeamStudents: 4,
      },
    });

    render(<StaffManualAllocationPanel projectId={4} />);

    fireEvent.click(screen.getByRole("button", { name: "Open manual allocation" }));

    await waitFor(() => {
      expect(getManualAllocationWorkspace).toHaveBeenCalledWith(4);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Close manual allocation" })).toBeInTheDocument();
    });

    expect(screen.getByText("12 students")).toBeInTheDocument();
    expect(screen.getByText("8 available")).toBeInTheDocument();
    expect(screen.getByText("4 already in a team")).toBeInTheDocument();
    expect(screen.getByLabelText("Manual allocation workspace")).toBeInTheDocument();
    expect(screen.getByLabelText("Manual allocation student list")).toBeInTheDocument();
    expect(screen.getByText("Already in a team")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Team: Team Alpha")).toBeInTheDocument();
    expect(screen.getByText("0 selected")).toBeInTheDocument();
  });

  it("supports selecting available students only", async () => {
    (getManualAllocationWorkspace as any).mockResolvedValue({
      project: { id: 4, name: "Project A", moduleId: 11, moduleName: "Module A" },
      existingTeams: [],
      students: [
        {
          id: 10,
          firstName: "Jin",
          lastName: "Johannesdottir",
          email: "jin@example.com",
          status: "ALREADY_IN_TEAM",
          currentTeam: { id: 7, teamName: "Team Alpha" },
        },
        {
          id: 11,
          firstName: "Pricha",
          lastName: "Lee",
          email: "pricha@example.com",
          status: "AVAILABLE",
          currentTeam: null,
        },
        {
          id: 12,
          firstName: "Sunil",
          lastName: "Stefansdottir",
          email: "sunil@example.com",
          status: "AVAILABLE",
          currentTeam: null,
        },
      ],
      counts: {
        totalStudents: 3,
        availableStudents: 2,
        alreadyInTeamStudents: 1,
      },
    });

    render(<StaffManualAllocationPanel projectId={4} />);
    fireEvent.click(screen.getByRole("button", { name: "Open manual allocation" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Close manual allocation" })).toBeInTheDocument();
    });

    const selectButtons = screen.getAllByRole("button", { name: "Select" });
    expect(selectButtons).toHaveLength(3);
    expect(selectButtons[0]).toBeDisabled();
    expect(selectButtons[1]).not.toBeDisabled();
    expect(selectButtons[2]).not.toBeDisabled();

    fireEvent.click(selectButtons[1]);
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create team" }));
    expect(screen.getByText("Enter a team name.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Manual team name"), { target: { value: "Team Gamma" } });
    fireEvent.click(screen.getByRole("button", { name: "Create team" }));
    expect(screen.getByText('Ready to create "Team Gamma" with 1 selected student.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Select all available" }));
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(screen.getByText("0 selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset form" }));
    expect((screen.getByLabelText("Manual team name") as HTMLInputElement).value).toBe("");
  });
});