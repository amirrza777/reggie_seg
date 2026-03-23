import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffAllocationDraftsPanel } from "./StaffAllocationDraftsPanel";
import { approveAllocationDraft, getAllocationDrafts } from "@/features/projects/api/teamAllocation";

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

describe("StaffAllocationDraftsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDraftsMock.mockResolvedValue(workspace as any);
  });

  it("loads and renders draft metadata and members", async () => {
    render(<StaffAllocationDraftsPanel projectId={9} />);
    await waitFor(() => {
      expect(getDraftsMock).toHaveBeenCalledWith(9);
    });
    await screen.findByText("1 draft");
    expect(screen.getByText("Allocation Drafts")).toBeInTheDocument();
    expect(screen.getByText("1 draft")).toBeInTheDocument();
    expect(screen.getByText("Role: Admin")).toBeInTheDocument();
    expect(screen.getByText("Draft Team 1")).toBeInTheDocument();
    expect(screen.getByText("Jin Johannesdottir")).toBeInTheDocument();
  });

  it("approves a draft and shows a success notice", async () => {
    approveDraftMock.mockResolvedValue({
      project: workspace.project,
      approvedTeam: { id: 501, teamName: "Draft Team 1", memberCount: 2 },
    } as any);
    render(<StaffAllocationDraftsPanel projectId={9} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Approve and activate" })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve and activate" }));
    await waitFor(() => {
      expect(approveDraftMock).toHaveBeenCalledWith(9, 31, { expectedUpdatedAt: "2026-03-23T08:00:00.000Z" });
    });
    expect(screen.getByText('Approved "Draft Team 1" and activated the team.')).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("normalizes migration-related load failures", async () => {
    getDraftsMock.mockRejectedValue(new Error("run the latest database migration first"));
    render(<StaffAllocationDraftsPanel projectId={9} />);
    await waitFor(() => {
      expect(screen.getByText(/Allocation drafts are temporarily unavailable/i)).toBeInTheDocument();
    });
  });
});