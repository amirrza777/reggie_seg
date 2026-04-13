import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffAllocationDraftsPanel } from "./StaffAllocationDraftsPanel";
import {
  approveAllocationDraft,
  deleteAllocationDraft,
  getAllocationDrafts,
  getManualAllocationWorkspace,
  updateAllocationDraft,
} from "@/features/projects/api/teamAllocation";
import { STAFF_ALLOCATION_DRAFTS_REFRESH_EVENT } from "./allocationDraftEvents";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("@/features/projects/api/teamAllocation", () => ({
  approveAllocationDraft: vi.fn(),
  deleteAllocationDraft: vi.fn(),
  getAllocationDrafts: vi.fn(),
  getManualAllocationWorkspace: vi.fn(),
  updateAllocationDraft: vi.fn(),
}));

const getDraftsMock = vi.mocked(getAllocationDrafts);
const approveDraftMock = vi.mocked(approveAllocationDraft);
const deleteDraftMock = vi.mocked(deleteAllocationDraft);
const manualWorkspaceMock = vi.mocked(getManualAllocationWorkspace);
const updateDraftMock = vi.mocked(updateAllocationDraft);

const workspace = {
  project: { id: 9, name: "Project A", moduleId: 4, moduleName: "Module A" },
  access: { actorRole: "ADMIN" as const, isModuleLead: true, isModuleTeachingAssistant: false, canApproveAllocationDrafts: true },
  drafts: [
    {
      id: 31,
      teamName: "Draft Team 1",
      memberCount: 2,
      createdAt: "2026-03-23T08:00:00.000Z",
      updatedAt: "2026-03-23T08:00:00.000Z",
      draftCreatedBy: { id: 3, firstName: "Sam", lastName: "Ng", email: "sam@example.com" },
      members: [{ id: 11, firstName: "Jin", lastName: "Johannesdottir", email: "jin@example.com" }],
    },
  ],
};

async function renderPanel() {
  render(<StaffAllocationDraftsPanel projectId={9} />);
  await waitFor(() => {
    expect(getDraftsMock).toHaveBeenCalledWith(9);
  });
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled();
  });
}

describe("StaffAllocationDraftsPanel", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    getDraftsMock.mockResolvedValue(workspace as any);
  });

  it("loads and renders draft metadata and members", async () => {
    await renderPanel();
    await screen.findByText("1 draft");
    expect(screen.getByText("Allocation Drafts")).toBeInTheDocument();
    expect(screen.getByText("Role: Admin")).toBeInTheDocument();
    expect(screen.getByText("Draft Team 1")).toBeInTheDocument();
    expect(screen.getByText("Jin Johannesdottir")).toBeInTheDocument();
  });

  it("approves a draft and shows a success notice", async () => {
    approveDraftMock.mockResolvedValue({
      project: workspace.project,
      approvedTeam: { id: 501, teamName: "Draft Team 1", memberCount: 2 },
    } as any);
    await renderPanel();
    await waitFor(() => expect(screen.getByRole("button", { name: "Approve and activate" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Approve and activate" }));
    await waitFor(() => {
      expect(approveDraftMock).toHaveBeenCalledWith(9, 31, { expectedUpdatedAt: "2026-03-23T08:00:00.000Z" });
    });
    expect(screen.getByText('Approved "Draft Team 1" and activated the team.')).toBeInTheDocument();
  });

  it("renames a draft and persists the updated name", async () => {
    updateDraftMock.mockResolvedValue({
      project: workspace.project,
      access: workspace.access,
      draft: { ...workspace.drafts[0], teamName: "Renamed Draft", updatedAt: "2026-03-24T08:00:00.000Z" },
    } as any);
    await renderPanel();
    await waitFor(() => expect(screen.getByRole("button", { name: "Rename draft" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Rename draft" }));
    fireEvent.change(screen.getByLabelText("Draft 31 team name"), { target: { value: "Renamed Draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Save name" }));
    await waitFor(() => expect(updateDraftMock).toHaveBeenCalled());
    expect(screen.getByText('Updated draft team name to "Renamed Draft".')).toBeInTheDocument();
  });

  it("shows a validation notice when trying to save an empty draft name", async () => {
    await renderPanel();
    await waitFor(() => expect(screen.getByRole("button", { name: "Rename draft" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Rename draft" }));
    fireEvent.change(screen.getByLabelText("Draft 31 team name"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Save name" }));
    expect(screen.getByText("Team name cannot be empty.")).toBeInTheDocument();
    expect(updateDraftMock).not.toHaveBeenCalled();
  });

  it("edits draft members and saves sorted student ids", async () => {
    manualWorkspaceMock.mockResolvedValue({
      students: [
        { id: 13, firstName: "A", lastName: "A", email: "a@example.com", status: "AVAILABLE", currentTeam: null },
        { id: 11, firstName: "Jin", lastName: "Johannesdottir", email: "jin@example.com", status: "ASSIGNED", currentTeam: { id: 31, teamName: "Draft Team 1" } },
        { id: 99, firstName: "X", lastName: "Y", email: "x@example.com", status: "ASSIGNED", currentTeam: { id: 77, teamName: "Other" } },
      ],
    } as any);
    updateDraftMock.mockResolvedValue({ project: workspace.project, access: workspace.access, draft: workspace.drafts[0] } as any);
    await renderPanel();
    await waitFor(() => expect(screen.getByRole("button", { name: "Edit members" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Edit members" }));
    const saveMembersButton = await screen.findByRole("button", { name: "Save members" });
    await waitFor(() => expect(saveMembersButton).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Selected" })).toHaveLength(2);
    });
    fireEvent.click(saveMembersButton);
    await waitFor(() => expect(updateDraftMock).toHaveBeenCalled());
    expect(updateDraftMock).toHaveBeenCalledWith(9, 31, expect.objectContaining({ studentIds: [11, 13] }));
  });

  it("deletes a draft after confirmation", async () => {
    deleteDraftMock.mockResolvedValue({ project: workspace.project, deletedDraft: { id: 31, teamName: "Draft Team 1" } } as any);
    await renderPanel();
    await waitFor(() => expect(screen.getByRole("button", { name: "Delete draft" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Delete draft" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete draft" }));
    await waitFor(() => expect(deleteDraftMock).toHaveBeenCalledWith(9, 31, { expectedUpdatedAt: "2026-03-23T08:00:00.000Z" }));
    expect(screen.getByText('Deleted draft "Draft Team 1".')).toBeInTheDocument();
  });

  it("shows approve failure notices from API errors", async () => {
    approveDraftMock.mockRejectedValue(new Error("Approval failed"));
    await renderPanel();
    await waitFor(() => expect(screen.getByRole("button", { name: "Approve and activate" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Approve and activate" }));
    expect(await screen.findByText("Approval failed")).toBeInTheDocument();
  });

  it("shows delete failure notices from API errors", async () => {
    deleteDraftMock.mockRejectedValue(new Error("Delete failed"));
    await renderPanel();
    await waitFor(() => expect(screen.getByRole("button", { name: "Delete draft" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Delete draft" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete draft" }));
    expect(await screen.findByText("Delete failed")).toBeInTheDocument();
  });

  it("renders non-approver empty-state notes", async () => {
    getDraftsMock.mockResolvedValue({ ...workspace, access: { ...workspace.access, canApproveAllocationDrafts: false }, drafts: [] } as any);
    await renderPanel();
    expect(screen.getByText("No allocation drafts yet.")).toBeInTheDocument();
    expect(screen.getByText(/Only module owners can approve drafts and activate teams/i)).toBeInTheDocument();
  });

  it("renders staff actor role label for non-admin viewers", async () => {
    getDraftsMock.mockResolvedValue({ ...workspace, access: { ...workspace.access, actorRole: "STAFF" } } as any);
    await renderPanel();
    expect(screen.getByText("Role: Staff")).toBeInTheDocument();
  });

  it("auto-refreshes drafts on the visibility interval when idle", async () => {
    const intervalSpy = vi.spyOn(window, "setInterval").mockImplementation((handler: TimerHandler) => {
      if (typeof handler === "function") handler();
      return 1;
    });
    const clearSpy = vi.spyOn(window, "clearInterval").mockImplementation(() => {});
    render(<StaffAllocationDraftsPanel projectId={9} />);
    await waitFor(() => expect(getDraftsMock).toHaveBeenCalledTimes(2));
    intervalSpy.mockRestore();
    clearSpy.mockRestore();
  });

  it("reloads drafts when refresh event is dispatched", async () => {
    await renderPanel();
    await waitFor(() => {
      expect(getDraftsMock).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      window.dispatchEvent(new Event(STAFF_ALLOCATION_DRAFTS_REFRESH_EVENT));
    });
    await waitFor(() => {
      expect(getDraftsMock).toHaveBeenCalledTimes(2);
    });
  });

  it("normalizes migration-related load failures", async () => {
    getDraftsMock.mockRejectedValue(new Error("run the latest database migration first"));
    render(<StaffAllocationDraftsPanel projectId={9} />);
    await waitFor(() => {
      expect(screen.getByText(/Allocation drafts are temporarily unavailable/i)).toBeInTheDocument();
    });
  });

  it("normalizes rename conflicts from API errors", async () => {
    updateDraftMock.mockRejectedValue(new Error("Refresh drafts and try again"));
    await renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Rename draft" }));
    fireEvent.change(screen.getByLabelText("Draft 31 team name"), { target: { value: "Renamed Draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Save name" }));
    expect(await screen.findByText(/This draft changed while you were editing it/i)).toBeInTheDocument();
  });

  it("normalizes member-load conflicts from API errors", async () => {
    manualWorkspaceMock.mockRejectedValue(new Error("updated by another staff member"));
    await renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Edit members" }));
    expect(await screen.findByText(/This draft changed while you were editing it/i)).toBeInTheDocument();
  });

  it("normalizes member-save conflicts from API errors", async () => {
    manualWorkspaceMock.mockResolvedValue({
      students: [{ id: 11, firstName: "Jin", lastName: "Johannesdottir", email: "jin@example.com", status: "ASSIGNED", currentTeam: { id: 31, teamName: "Draft Team 1" } }],
    } as any);
    updateDraftMock.mockRejectedValue(new Error("Refresh drafts and try again"));
    await renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Edit members" }));
    const saveMembersButton = await screen.findByRole("button", { name: "Save members" });
    await waitFor(() => expect(saveMembersButton).toBeEnabled());
    fireEvent.click(saveMembersButton);
    expect(await screen.findByText(/This draft changed while you were editing it/i)).toBeInTheDocument();
  });
});
