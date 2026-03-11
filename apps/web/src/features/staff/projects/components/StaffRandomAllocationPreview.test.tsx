import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffRandomAllocationPreview } from "./StaffRandomAllocationPreview";

const getRandomAllocationPreviewMock = vi.fn();

vi.mock("@/features/projects/api/teamAllocation", () => ({
  getRandomAllocationPreview: (...args: unknown[]) => getRandomAllocationPreviewMock(...args),
}));

describe("StaffRandomAllocationPreview", () => {
  beforeEach(() => {
    getRandomAllocationPreviewMock.mockReset();
  });

  it("requests and renders random preview results", async () => {
    getRandomAllocationPreviewMock.mockResolvedValue({
      project: { id: 4, name: "Project A", moduleId: 2, moduleName: "Module A" },
      studentCount: 4,
      teamCount: 2,
      existingTeams: [{ id: 1, teamName: "Team Alpha", memberCount: 2 }],
      previewTeams: [
        {
          index: 0,
          suggestedName: "Random Team 1",
          members: [
            { id: 11, firstName: "Jin", lastName: "Johannesdottir", email: "jin@example.com" },
            { id: 12, firstName: "Sunil", lastName: "Stefansdottir", email: "sunil@example.com" },
          ],
        },
        {
          index: 1,
          suggestedName: "Random Team 2",
          members: [
            { id: 13, firstName: "Rachel", lastName: "Yin", email: "rachel@example.com" },
            { id: 14, firstName: "Pricha", lastName: "Lee", email: "pricha@example.com" },
          ],
        },
      ],
    });

    render(<StaffRandomAllocationPreview projectId={4} initialTeamCount={2} />);

    fireEvent.change(screen.getByLabelText("Team count"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "101" } });
    fireEvent.click(screen.getByRole("button", { name: /preview random teams/i }));

    await waitFor(() => {
      expect(getRandomAllocationPreviewMock).toHaveBeenCalledWith(4, 2, 101);
    });
    expect(screen.getByText("Random Team 1")).toBeInTheDocument();
    expect(screen.getByText("Jin Johannesdottir")).toBeInTheDocument();
  });

  it("shows validation error for invalid team count", async () => {
    render(<StaffRandomAllocationPreview projectId={4} initialTeamCount={2} />);

    fireEvent.change(screen.getByLabelText("Team count"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /preview random teams/i }));

    expect(screen.getByText("Team count must be a positive integer.")).toBeInTheDocument();
    expect(getRandomAllocationPreviewMock).not.toHaveBeenCalled();
  });
});