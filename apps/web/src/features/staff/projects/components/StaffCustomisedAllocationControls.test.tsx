import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffCustomisedAllocationControls } from "./StaffCustomisedAllocationControls";

const baseProps: ComponentProps<typeof StaffCustomisedAllocationControls> = {
  teamCountInput: "2",
  onTeamCountInputChange: vi.fn(),
  minTeamSizeInput: "",
  onMinTeamSizeInputChange: vi.fn(),
  maxTeamSizeInput: "",
  onMaxTeamSizeInputChange: vi.fn(),
  runPreview: vi.fn(),
  runApplyAllocation: vi.fn(),
  canPreparePreview: true,
  isLoadingCoverage: false,
  confirmApply: false,
  isPreviewPending: false,
  isApplyPending: false,
  isPreviewCurrent: true,
  hasPreview: false,
  errorMessage: "",
  successMessage: "",
};

function renderControls(overrides: Partial<ComponentProps<typeof StaffCustomisedAllocationControls>> = {}) {
  const props = { ...baseProps, ...overrides };
  render(<StaffCustomisedAllocationControls {...props} />);
  return props;
}

describe("StaffCustomisedAllocationControls", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates numeric inputs and triggers preview action", () => {
    const props = renderControls();
    fireEvent.change(screen.getByLabelText("Customised team count"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Customised minimum students per team"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Customised maximum students per team"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview customised teams" }));
    expect(props.onTeamCountInputChange).toHaveBeenCalledWith("3");
    expect(props.onMinTeamSizeInputChange).toHaveBeenCalledWith("2");
    expect(props.onMaxTeamSizeInputChange).toHaveBeenCalledWith("5");
    expect(props.runPreview).toHaveBeenCalledTimes(1);
    expect(props.runApplyAllocation).not.toHaveBeenCalled();
  });

  it("runs apply action when preview is current and confirmation is enabled", () => {
    const props = renderControls({ hasPreview: true, confirmApply: true, isPreviewCurrent: true });
    fireEvent.click(screen.getByRole("button", { name: "Save draft allocation" }));
    expect(props.runApplyAllocation).toHaveBeenCalledTimes(1);
  });

  it("disables buttons and shows stale-preview warning", () => {
    renderControls({ canPreparePreview: false, hasPreview: true, isPreviewCurrent: false });
    expect(screen.getByRole("button", { name: "Preview customised teams" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save draft allocation" })).toBeDisabled();
    expect(screen.getByText(/Inputs changed since last preview/i)).toBeInTheDocument();
  });

  it("renders error and success messages", () => {
    renderControls({ errorMessage: "invalid input", successMessage: "saved" });
    expect(screen.getByText("invalid input")).toBeInTheDocument();
    expect(screen.getByText("saved")).toBeInTheDocument();
  });
});