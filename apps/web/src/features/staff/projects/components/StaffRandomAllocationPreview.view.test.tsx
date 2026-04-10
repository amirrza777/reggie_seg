import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffRandomAllocationPreview } from "./StaffRandomAllocationPreview.view";
import { useStaffRandomAllocationPreview } from "./useStaffRandomAllocationPreview";

vi.mock("./useStaffRandomAllocationPreview", () => ({
  useStaffRandomAllocationPreview: vi.fn(),
  toRandomPreviewFullName: (m: { firstName: string; lastName: string; email: string }) =>
    `${m.firstName} ${m.lastName}`.trim() || m.email,
}));

const baseHook = {
  teamCountInput: "2", minTeamSizeInput: "", maxTeamSizeInput: "",
  preview: null, teamNames: {}, renamingTeams: {}, confirmApply: false,
  errorMessage: "", successMessage: "", isPreviewPending: false, isApplyPending: false,
  isPreviewCurrent: false, getTeamName: (_: number, name: string) => name,
  runPreview: vi.fn(), runApplyAllocation: vi.fn(), toggleConfirmAllocation: vi.fn(),
  onTeamNameChange: vi.fn(), onToggleTeamRename: vi.fn(),
  onTeamCountChange: vi.fn(), onMinTeamSizeChange: vi.fn(), onMaxTeamSizeChange: vi.fn(),
};

describe("StaffRandomAllocationPreview view", () => {
  beforeEach(() => {
    vi.mocked(useStaffRandomAllocationPreview).mockReturnValue(baseHook as any);
  });

  it("renders the section with random allocation aria-label", () => {
    render(<StaffRandomAllocationPreview projectId={4} initialTeamCount={2} />);
    expect(screen.getByLabelText("Random allocation preview")).toBeInTheDocument();
  });

  it("shows standalone heading and description in non-embedded mode", () => {
    render(<StaffRandomAllocationPreview projectId={4} initialTeamCount={2} />);
    expect(screen.getByText("Random allocation preview")).toBeInTheDocument();
    expect(screen.getByText(/Only vacant students are included/i)).toBeInTheDocument();
  });

  it("omits heading and description in embedded mode", () => {
    render(<StaffRandomAllocationPreview projectId={4} initialTeamCount={2} embedded />);
    expect(screen.queryByText("Random allocation preview")).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Random allocation preview"),
    ).toHaveClass("staff-projects__allocation-content--embedded");
  });
});