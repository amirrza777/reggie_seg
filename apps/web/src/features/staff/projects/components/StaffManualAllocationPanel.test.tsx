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
      students: [],
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
  });
});