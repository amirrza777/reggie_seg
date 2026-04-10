import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffAllocationDraftsPanel } from "./StaffAllocationDraftsPanel.view";
import { useStaffAllocationDraftsPanel } from "./useStaffAllocationDraftsPanel";

vi.mock("./useStaffAllocationDraftsPanel", () => ({
  useStaffAllocationDraftsPanel: vi.fn(),
  toAllocationDraftFullName: (m: { firstName: string; lastName: string; email: string }) =>
    `${m.firstName} ${m.lastName}`.trim() || m.email,
  formatActorRole: (role: string) => role,
}));
vi.mock("@/shared/ui/ConfirmationModal", () => ({
  ConfirmationModal: ({ open, title }: { open: boolean; title: string }) =>
    open ? <div role="dialog">{title}</div> : null,
}));

const baseHookReturn = {
  workspace: null,
  errorMessage: "",
  notice: null,
  editingNameTeamId: null,
  editedTeamName: "",
  setEditedTeamName: vi.fn(),
  editingMembersTeamId: null,
  memberCandidates: [],
  selectedMemberIds: [],
  isLoadingDrafts: false,
  isSaving: false,
  canApprove: false,
  isBusy: false,
  editingDraft: null,
  pendingDeleteDraft: null,
  loadDrafts: vi.fn(),
  startRename: vi.fn(),
  cancelRename: vi.fn(),
  saveRename: vi.fn(),
  toggleSelectedMember: vi.fn(),
  startEditMembers: vi.fn(),
  cancelEditMembers: vi.fn(),
  saveMembers: vi.fn(),
  handleApprove: vi.fn(),
  handleDelete: vi.fn(),
  confirmDelete: vi.fn(),
  setPendingDeleteDraftId: vi.fn(),
};

describe("StaffAllocationDraftsPanel view", () => {
  beforeEach(() => {
    vi.mocked(useStaffAllocationDraftsPanel).mockReturnValue(baseHookReturn as any);
  });

  it("renders the section heading", () => {
    render(<StaffAllocationDraftsPanel projectId={9} />);
    expect(screen.getByText("Allocation Drafts")).toBeInTheDocument();
  });

  it("shows error message when present", () => {
    vi.mocked(useStaffAllocationDraftsPanel).mockReturnValue({
      ...baseHookReturn,
      errorMessage: "Load failed",
    } as any);
    render(<StaffAllocationDraftsPanel projectId={9} />);
    expect(screen.getByText("Load failed")).toBeInTheDocument();
  });

  it("shows non-approver note when workspace is loaded and canApprove is false", () => {
    const workspace = {
      project: { id: 9, name: "P" },
      access: { actorRole: "STAFF", canApproveAllocationDrafts: false },
      drafts: [],
    };
    vi.mocked(useStaffAllocationDraftsPanel).mockReturnValue({
      ...baseHookReturn,
      workspace,
      canApprove: false,
    } as any);
    render(<StaffAllocationDraftsPanel projectId={9} />);
    expect(screen.getByText(/Only module owners can approve drafts/i)).toBeInTheDocument();
  });
});