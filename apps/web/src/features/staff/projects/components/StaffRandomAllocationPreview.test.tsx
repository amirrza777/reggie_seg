import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffRandomAllocationPreview } from "./StaffRandomAllocationPreview";

const getRandomAllocationPreviewMock = vi.fn();
const applyRandomAllocationMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock("@/features/projects/api/teamAllocation", () => ({
  getRandomAllocationPreview: (...args: unknown[]) => getRandomAllocationPreviewMock(...args),
  applyRandomAllocation: (...args: unknown[]) => applyRandomAllocationMock(...args),
}));

describe("StaffRandomAllocationPreview", () => {
  async function waitForPreviewReady() {
    await waitFor(
      () => {
        expect(screen.getByLabelText("Team count")).toBeEnabled();
      },
      { timeout: 5000 },
    );
  }

  beforeEach(() => {
    getRandomAllocationPreviewMock.mockReset();
    applyRandomAllocationMock.mockReset();
    refreshMock.mockReset();
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
      unassignedStudents: [],
    });

    render(<StaffRandomAllocationPreview projectId={4} initialTeamCount={2} />);
    expect(
      screen.getByText("Only vacant students are included here. Students already assigned to a team in this project are excluded.")
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Team count"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /preview random teams/i }));

    await waitFor(() => {
      expect(getRandomAllocationPreviewMock).toHaveBeenCalledWith(4, 2);
    });
    await waitForPreviewReady();
    expect(screen.getByText("Random Team 1")).toBeInTheDocument();
    expect(screen.getByText("Jin Johannesdottir")).toBeInTheDocument();
    expect(screen.getByText("4 vacant students")).toBeInTheDocument();
  });

  it("applies allocation and refreshes route", async () => {
    getRandomAllocationPreviewMock.mockResolvedValue({
      project: { id: 4, name: "Project A", moduleId: 2, moduleName: "Module A" },
      studentCount: 4,
      teamCount: 2,
      existingTeams: [],
      previewTeams: [
        {
          index: 0,
          suggestedName: "Random Team 1",
          members: [{ id: 11, firstName: "Jin", lastName: "Johannesdottir", email: "jin@example.com" }],
        },
        {
          index: 1,
          suggestedName: "Random Team 2",
          members: [{ id: 12, firstName: "Sunil", lastName: "Stefansdottir", email: "sunil@example.com" }],
        },
      ],
      unassignedStudents: [],
    });
    applyRandomAllocationMock.mockResolvedValue({
      project: { id: 4, name: "Project A", moduleId: 2, moduleName: "Module A" },
      studentCount: 4,
      teamCount: 2,
      appliedTeams: [
        { id: 1, teamName: "Team A", memberCount: 2 },
        { id: 2, teamName: "Team B", memberCount: 2 },
      ],
    });

    render(<StaffRandomAllocationPreview projectId={4} initialTeamCount={2} />);

    fireEvent.change(screen.getByLabelText("Team count"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /preview random teams/i }));

    await waitFor(() => {
      expect(getRandomAllocationPreviewMock).toHaveBeenCalledWith(4, 2);
    });
    await waitForPreviewReady();
    await screen.findByText("Random Team 1");
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Rename" })[0]).toBeEnabled();
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Rename" })[0]);
    const teamNameInput = await screen.findByLabelText("Team 1 name");
    fireEvent.change(teamNameInput, { target: { value: "Team Orion" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Team Orion")).toBeInTheDocument();

    const applyButton = screen.getByRole("button", { name: /save draft allocation/i });
    expect(applyButton).toBeDisabled();
    fireEvent.click(applyButton);
    expect(applyRandomAllocationMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /confirm allocation/i }));
    expect(screen.getByRole("button", { name: /confirmed/i })).toBeInTheDocument();
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(applyRandomAllocationMock).toHaveBeenCalledWith(4, 2, ["Team Orion", "Random Team 2"]);
    });
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("Saved random allocation as draft across 2 teams.")).toBeInTheDocument();
    expect(
      screen.queryByText("This creates draft teams for vacant students only. Existing team memberships in this project stay unchanged.")
    ).not.toBeInTheDocument();
  });

  it("locks random preview inputs and renaming while allocation is confirmed", async () => {
    getRandomAllocationPreviewMock.mockResolvedValue({
      project: { id: 4, name: "Project A", moduleId: 2, moduleName: "Module A" },
      studentCount: 4,
      teamCount: 2,
      existingTeams: [],
      previewTeams: [
        {
          index: 0,
          suggestedName: "Random Team 1",
          members: [{ id: 11, firstName: "Jin", lastName: "Johannesdottir", email: "jin@example.com" }],
        },
        {
          index: 1,
          suggestedName: "Random Team 2",
          members: [{ id: 12, firstName: "Sunil", lastName: "Stefansdottir", email: "sunil@example.com" }],
        },
      ],
      unassignedStudents: [],
    });

    render(<StaffRandomAllocationPreview projectId={4} initialTeamCount={2} />);

    fireEvent.click(screen.getByRole("button", { name: /preview random teams/i }));
    await waitFor(() => {
      expect(getRandomAllocationPreviewMock).toHaveBeenCalledWith(4, 2);
    });
    await waitForPreviewReady();

    fireEvent.click(screen.getByRole("button", { name: /confirm allocation/i }));
    expect(screen.getByRole("button", { name: /confirmed/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Team count")).toBeDisabled();
    expect(screen.getByLabelText("Minimum students per team")).toBeDisabled();
    expect(screen.getByLabelText("Maximum students per team")).toBeDisabled();
    expect(screen.getByRole("button", { name: /preview random teams/i })).toBeDisabled();
    for (const button of screen.getAllByRole("button", { name: "Rename" })) {
      expect(button).toBeDisabled();
    }

    fireEvent.click(screen.getByRole("button", { name: /confirmed/i }));
    expect(screen.getByRole("button", { name: /confirm allocation/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Team count")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /preview random teams/i })).not.toBeDisabled();
    for (const button of screen.getAllByRole("button", { name: "Rename" })) {
      expect(button).not.toBeDisabled();
    }
  });

  it("requires a fresh preview when inputs change", async () => {
    getRandomAllocationPreviewMock.mockResolvedValue({
      project: { id: 4, name: "Project A", moduleId: 2, moduleName: "Module A" },
      studentCount: 4,
      teamCount: 2,
      existingTeams: [],
      previewTeams: [
        {
          index: 0,
          suggestedName: "Random Team 1",
          members: [{ id: 11, firstName: "Jin", lastName: "Johannesdottir", email: "jin@example.com" }],
        },
        {
          index: 1,
          suggestedName: "Random Team 2",
          members: [{ id: 12, firstName: "Sunil", lastName: "Stefansdottir", email: "sunil@example.com" }],
        },
      ],
      unassignedStudents: [],
    });

    render(<StaffRandomAllocationPreview projectId={4} initialTeamCount={2} />);

    fireEvent.change(screen.getByLabelText("Team count"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /preview random teams/i }));
    await waitFor(() => {
      expect(getRandomAllocationPreviewMock).toHaveBeenCalledWith(4, 2);
    });
    await waitForPreviewReady();

    fireEvent.change(screen.getByLabelText("Team count"), { target: { value: "3" } });
    expect(screen.getByText("Inputs changed since last preview. Generate a new preview before applying.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /save draft allocation/i }));
    expect(applyRandomAllocationMock).not.toHaveBeenCalled();
  });

  it("shows validation error for invalid team count", async () => {
    render(<StaffRandomAllocationPreview projectId={4} initialTeamCount={2} />);

    fireEvent.change(screen.getByLabelText("Team count"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /preview random teams/i }));

    expect(screen.getByText("Team count must be a positive integer.")).toBeInTheDocument();
    expect(getRandomAllocationPreviewMock).not.toHaveBeenCalled();
  });
});
