import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StaffAllocationModesPanel } from "./StaffAllocationModesPanel";

vi.mock("./StaffRandomAllocationPreview", () => ({
  StaffRandomAllocationPreview: () => (
    <div data-testid="random-allocation-content">Random allocation content</div>
  ),
}));

vi.mock("./StaffManualAllocationPanel", () => ({
  StaffManualAllocationPanel: () => (
    <div data-testid="manual-allocation-content">Manual allocation content</div>
  ),
}));

describe("StaffAllocationModesPanel", () => {
  it("renders wrapper and all allocation mode cards", () => {
    render(<StaffAllocationModesPanel projectId={4} initialTeamCount={2} />);

    expect(screen.getByRole("heading", { name: "Team Allocation Methods" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Random Allocation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Manual Allocation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Customised Allocation" })).toBeInTheDocument();

    expect(screen.getAllByRole("button", { name: /expand/i })).toHaveLength(3);
    expect(screen.queryByTestId("random-allocation-content")).not.toBeInTheDocument();
  });

  it("expands one mode at a time and mounts random content in random mode only", () => {
    render(<StaffAllocationModesPanel projectId={4} initialTeamCount={2} />);

    fireEvent.click(screen.getByRole("button", { name: "Expand Random Allocation" }));
    expect(screen.getByTestId("random-allocation-content")).toBeInTheDocument();
    expect(screen.queryByTestId("manual-allocation-content")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse Random Allocation" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand Manual Allocation" }));
    expect(screen.queryByTestId("random-allocation-content")).not.toBeInTheDocument();
    expect(screen.getByTestId("manual-allocation-content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse Manual Allocation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand Customised Allocation" })).toBeInTheDocument();
  });
});