import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffManualAllocationPanel } from "./StaffManualAllocationPanel";
import { applyManualAllocation, getManualAllocationWorkspace } from "@/features/projects/api/teamAllocation";
import { SEARCH_DEBOUNCE_MS } from "@/shared/lib/search";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/features/projects/api/teamAllocation", () => ({
  applyManualAllocation: vi.fn(),
  getManualAllocationWorkspace: vi.fn(),
}));

const getWorkspaceMock = vi.mocked(getManualAllocationWorkspace);
const applyManualMock = vi.mocked(applyManualAllocation);

const baseWorkspace = {
  project: { id: 4, name: "Project A", moduleId: 11, moduleName: "Module A" },
  existingTeams: [],
  students: [{ id: 11, firstName: "Pricha", lastName: "Lee", email: "pricha@example.com", status: "AVAILABLE", currentTeam: null }],
  counts: { totalStudents: 1, availableStudents: 1, alreadyInTeamStudents: 0 },
};

async function openWorkspace() {
  fireEvent.click(screen.getByRole("button", { name: "Open manual allocation" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Close manual allocation" })).toBeEnabled());
}

async function waitForDebounce() {
  await new Promise((resolve) => setTimeout(resolve, SEARCH_DEBOUNCE_MS + 40));
}

describe("StaffManualAllocationPanel additional coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getWorkspaceMock.mockResolvedValue(baseWorkspace as never);
  });

  it("reopens cached workspace without reloading data", async () => {
    render(<StaffManualAllocationPanel projectId={4} />);
    await openWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Close manual allocation" }));
    fireEvent.click(screen.getByRole("button", { name: "Open manual allocation" }));
    expect(getWorkspaceMock).toHaveBeenCalledTimes(1);
  });

  it("shows fallback workspace load error for non-error failures", async () => {
    getWorkspaceMock.mockRejectedValue("bad");
    render(<StaffManualAllocationPanel projectId={4} />);
    fireEvent.click(screen.getByRole("button", { name: "Open manual allocation" }));
    expect(await screen.findByText("Failed to load manual allocation workspace.")).toBeInTheDocument();
  });

  it("requires at least one selected student before submit", async () => {
    render(<StaffManualAllocationPanel projectId={4} />);
    await openWorkspace();
    fireEvent.change(screen.getByLabelText("Manual team name"), { target: { value: "Team Delta" } });
    fireEvent.click(screen.getByRole("button", { name: "Create draft team" }));
    expect(await screen.findByText("Select at least one available student.")).toBeInTheDocument();
    expect(applyManualMock).not.toHaveBeenCalled();
  });

  it("debounces search refresh and trims selected IDs to available students", async () => {
    getWorkspaceMock.mockResolvedValueOnce({
      ...baseWorkspace,
      students: [
        { id: 11, firstName: "Pricha", lastName: "Lee", email: "pricha@example.com", status: "AVAILABLE", currentTeam: null },
        { id: 12, firstName: "Sunil", lastName: "Stef", email: "sunil@example.com", status: "AVAILABLE", currentTeam: null },
      ],
      counts: { totalStudents: 2, availableStudents: 2, alreadyInTeamStudents: 0 },
    } as never).mockResolvedValueOnce({
      ...baseWorkspace,
      students: [{ id: 11, firstName: "Pricha", lastName: "Lee", email: "pricha@example.com", status: "ALREADY_IN_TEAM", currentTeam: { id: 8, teamName: "Taken" } }],
      counts: { totalStudents: 1, availableStudents: 0, alreadyInTeamStudents: 1 },
    } as never);

    render(<StaffManualAllocationPanel projectId={4} />);
    await openWorkspace();
    fireEvent.click(screen.getAllByRole("button", { name: "Select" })[0]);
    fireEvent.change(screen.getByLabelText("Search students"), { target: { value: "p" } });
    fireEvent.change(screen.getByLabelText("Search students"), { target: { value: "pr" } });
    await act(async () => {
      await waitForDebounce();
    });
    await waitFor(() => expect(getWorkspaceMock).toHaveBeenLastCalledWith(4, "pr"));
    expect(screen.getByText("0 selected")).toBeInTheDocument();
  });

  it("uses the current search query on manual refresh", async () => {
    render(<StaffManualAllocationPanel projectId={4} />);
    await openWorkspace();
    fireEvent.change(screen.getByLabelText("Search students"), { target: { value: "  delta  " } });
    fireEvent.click(screen.getByRole("button", { name: "Refresh list" }));
    await waitFor(() => expect(getWorkspaceMock).toHaveBeenLastCalledWith(4, "delta"));
  });

  it("shows generic post-save refresh failure and no-match text", async () => {
    getWorkspaceMock
      .mockResolvedValueOnce(baseWorkspace as never)
      .mockRejectedValueOnce("offline")
      .mockResolvedValueOnce({ ...baseWorkspace, students: [], counts: { totalStudents: 0, availableStudents: 0, alreadyInTeamStudents: 0 } } as never);
    applyManualMock.mockResolvedValue({ project: baseWorkspace.project, team: { id: 90, teamName: "Team Delta", memberCount: 1 } } as never);

    render(<StaffManualAllocationPanel projectId={4} />);
    await openWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    fireEvent.change(screen.getByLabelText("Manual team name"), { target: { value: "Team Delta" } });
    fireEvent.change(screen.getByLabelText("Search students"), { target: { value: "delta" } });
    fireEvent.click(screen.getByRole("button", { name: "Create draft team" }));
    expect(await screen.findByText("Draft saved, but workspace refresh failed.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search students"), { target: { value: "ghost" } });
    await act(async () => {
      await waitForDebounce();
    });
    expect(await screen.findByText('No students match "ghost".')).toBeInTheDocument();
  });
});