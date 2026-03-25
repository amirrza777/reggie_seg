import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffRandomAllocationPreview } from "./StaffRandomAllocationPreview";
import { applyRandomAllocation, getRandomAllocationPreview } from "@/features/projects/api/teamAllocation";
import { emitStaffAllocationDraftsRefresh } from "./allocationDraftEvents";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("./allocationDraftEvents", () => ({ emitStaffAllocationDraftsRefresh: vi.fn() }));
vi.mock("@/features/projects/api/teamAllocation", () => ({
  applyRandomAllocation: vi.fn(),
  getRandomAllocationPreview: vi.fn(),
}));

const getPreviewMock = vi.mocked(getRandomAllocationPreview);
const applyRandomMock = vi.mocked(applyRandomAllocation);
const emitRefreshEventMock = vi.mocked(emitStaffAllocationDraftsRefresh);

const project = { id: 4, name: "Project A", moduleId: 2, moduleName: "Module A" };
const preview = {
  project,
  studentCount: 4,
  teamCount: 2,
  existingTeams: [],
  unassignedStudents: [],
  previewTeams: [
    { index: 0, suggestedName: "Random Team 1", members: [{ id: 11, firstName: "Jin", lastName: "Johannesdottir", email: "jin@example.com" }] },
    { index: 1, suggestedName: "Random Team 2", members: [{ id: 12, firstName: "Sunil", lastName: "Stefansdottir", email: "sunil@example.com" }] },
  ],
};

async function previewTeams() {
  fireEvent.click(screen.getByRole("button", { name: /preview random teams/i }));
  await waitFor(() => {
    expect(getPreviewMock).toHaveBeenCalledWith(4, 2);
  });
  await waitFor(() => {
    expect(screen.getAllByRole("button", { name: "Rename" })[0]).toBeEnabled();
  });
}

describe("StaffRandomAllocationPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPreviewMock.mockResolvedValue(preview);
  });

  it("shows validation error for invalid team count", async () => {
    render(<StaffRandomAllocationPreview projectId={4} initialTeamCount={2} />);
    fireEvent.change(screen.getByLabelText("Team count"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /preview random teams/i }));
    expect(screen.getByText("Team count must be a positive integer.")).toBeInTheDocument();
    expect(getPreviewMock).not.toHaveBeenCalled();
  });

  it("requests random preview and renders suggested teams", async () => {
    render(<StaffRandomAllocationPreview projectId={4} initialTeamCount={2} />);
    await previewTeams();
    expect(screen.getByText("Random Team 1")).toBeInTheDocument();
    expect(screen.getByText("Jin Johannesdottir")).toBeInTheDocument();
    expect(screen.getByText("4 vacant students")).toBeInTheDocument();
  });

  it("requires confirmation before applying allocation", async () => {
    render(<StaffRandomAllocationPreview projectId={4} initialTeamCount={2} />);
    await previewTeams();
    expect(screen.getByRole("button", { name: /save draft allocation/i })).toBeDisabled();
    expect(applyRandomMock).not.toHaveBeenCalled();
  });

  it("applies confirmed allocation with renamed teams", async () => {
    applyRandomMock.mockResolvedValue({ project, studentCount: 4, teamCount: 2, appliedTeams: [{ id: 1, teamName: "Team Orion", memberCount: 2 }] });
    render(<StaffRandomAllocationPreview projectId={4} initialTeamCount={2} />);
    await previewTeams();
    fireEvent.click(screen.getAllByRole("button", { name: "Rename" })[0]);
    fireEvent.change(screen.getByLabelText("Team 1 name"), { target: { value: "Team Orion" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: /confirm allocation/i }));
    fireEvent.click(screen.getByRole("button", { name: /save draft allocation/i }));
    await waitFor(() => {
      expect(applyRandomMock).toHaveBeenCalledWith(4, 2, ["Team Orion", "Random Team 2"]);
    });
    expect(screen.getByText("Saved random allocation as draft across 1 team.")).toBeInTheDocument();
    expect(emitRefreshEventMock).toHaveBeenCalledTimes(1);
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});