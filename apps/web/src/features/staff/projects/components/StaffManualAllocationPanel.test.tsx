import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffManualAllocationPanel } from "./StaffManualAllocationPanel";
import { applyManualAllocation, getManualAllocationWorkspace } from "@/features/projects/api/teamAllocation";
import { emitStaffAllocationDraftsRefresh } from "./allocationDraftEvents";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("./allocationDraftEvents", () => ({ emitStaffAllocationDraftsRefresh: vi.fn() }));
vi.mock("@/features/projects/api/teamAllocation", () => ({
  applyManualAllocation: vi.fn(),
  getManualAllocationWorkspace: vi.fn(),
}));

const getWorkspaceMock = vi.mocked(getManualAllocationWorkspace);
const applyManualMock = vi.mocked(applyManualAllocation);
const emitRefreshEventMock = vi.mocked(emitStaffAllocationDraftsRefresh);

const project = { id: 4, name: "Project A", moduleId: 11, moduleName: "Module A" };
const assignedStudent = {
  id: 10,
  firstName: "Jin",
  lastName: "Johannesdottir",
  email: "jin@example.com",
  status: "ALREADY_IN_TEAM" as const,
  currentTeam: { id: 7, teamName: "Team Alpha" },
};
const availableStudent = {
  id: 11,
  firstName: "Pricha",
  lastName: "Lee",
  email: "pricha@example.com",
  status: "AVAILABLE" as const,
  currentTeam: null,
};

function workspace(students = [assignedStudent, availableStudent]) {
  const available = students.filter((student) => student.status === "AVAILABLE").length;
  return {
    project,
    existingTeams: [],
    students,
    counts: { totalStudents: students.length, availableStudents: available, alreadyInTeamStudents: students.length - available },
  };
}

async function openWorkspacePanel() {
  fireEvent.click(screen.getByRole("button", { name: "Open manual allocation" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Manual allocation workspace")).toBeInTheDocument();
  });
}

async function createDraft(teamName: string) {
  let enabledButton: HTMLButtonElement | undefined;
  await waitFor(() => {
    const selectButtons = screen.getAllByRole("button", { name: "Select" }) as HTMLButtonElement[];
    enabledButton = selectButtons.find((button) => !button.hasAttribute("disabled"));
    expect(enabledButton).toBeDefined();
  });
  fireEvent.click(enabledButton as HTMLButtonElement);
  await waitFor(() => {
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });
  fireEvent.change(screen.getByLabelText("Manual team name"), { target: { value: teamName } });
  fireEvent.click(screen.getByRole("button", { name: "Create draft team" }));
}

describe("StaffManualAllocationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getWorkspaceMock.mockResolvedValue(workspace());
  });

  it("loads workspace on open and shows summary badges", async () => {
    render(<StaffManualAllocationPanel projectId={4} />);
    await openWorkspacePanel();
    expect(getWorkspaceMock).toHaveBeenCalledWith(4);
    expect(screen.getByText("2 students")).toBeInTheDocument();
    expect(screen.getByText("1 available")).toBeInTheDocument();
    expect(screen.getByText("1 already in a team")).toBeInTheDocument();
    expect(screen.getByText("Already assigned")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
  });

  it("creates a draft team, refreshes workspace, and emits refresh event", async () => {
    getWorkspaceMock.mockResolvedValueOnce(workspace()).mockResolvedValueOnce(workspace([assignedStudent]));
    applyManualMock.mockResolvedValue({ project, team: { id: 90, teamName: "Team Gamma", memberCount: 1 } });
    render(<StaffManualAllocationPanel projectId={4} />);
    await openWorkspacePanel();
    await createDraft("Team Gamma");
    await waitFor(() => {
      expect(applyManualMock).toHaveBeenCalledWith(4, "Team Gamma", [11]);
    });
    expect(screen.getByText('Saved draft "Team Gamma" with 1 student.')).toBeInTheDocument();
    expect(emitRefreshEventMock).toHaveBeenCalledTimes(1);
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(getWorkspaceMock).toHaveBeenCalledTimes(2);
  });

  it("validates that team name is provided", async () => {
    render(<StaffManualAllocationPanel projectId={4} />);
    await openWorkspacePanel();
    fireEvent.click(screen.getAllByRole("button", { name: "Select" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Create draft team" }));
    expect(screen.getByText("Enter a team name.")).toBeInTheDocument();
    expect(applyManualMock).not.toHaveBeenCalled();
  });

  it("shows backend error message when draft creation fails", async () => {
    applyManualMock.mockRejectedValue(new Error("Team name already exists in this enterprise"));
    render(<StaffManualAllocationPanel projectId={4} />);
    await openWorkspacePanel();
    await createDraft("Team Gamma");
    await waitFor(() => {
      expect(screen.getByText("Team name already exists in this enterprise")).toBeInTheDocument();
    });
    expect(emitRefreshEventMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });
});