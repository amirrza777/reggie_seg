import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StaffProjectCreatePanelStudentPicker } from "./StaffProjectCreatePanel.student-picker";

const students = [
  {
    id: 1,
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    enrolled: true,
    active: true,
  },
];

function renderPicker(overrides: Record<string, unknown> = {}) {
  const props = {
    enrolledModuleStudents: students,
    filteredModuleStudents: students,
    selectedStudentIds: [1],
    studentSearchInput: "",
    isLoadingModuleStudents: false,
    moduleStudentsError: null,
    onRefresh: vi.fn(),
    onSelectAll: vi.fn(),
    onClearSelection: vi.fn(),
    onToggleStudent: vi.fn(),
    onSearchChange: vi.fn(),
    ...overrides,
  };

  render(<StaffProjectCreatePanelStudentPicker {...(props as never)} />);
  return props;
}

describe("StaffProjectCreatePanelStudentPicker", () => {
  it("renders list state and invokes toolbar/search/toggle callbacks", () => {
    const props = renderPicker();

    fireEvent.click(screen.getByRole("button", { name: /Refresh list/i }));
    fireEvent.click(screen.getByRole("button", { name: /Select all students in module/i }));
    fireEvent.click(screen.getByRole("button", { name: /Clear selection/i }));
    fireEvent.change(screen.getByLabelText(/Search module students/i), { target: { value: "ada" } });
    fireEvent.click(screen.getByRole("button", { name: "Selected" }));

    expect(props.onRefresh).toHaveBeenCalled();
    expect(props.onSelectAll).toHaveBeenCalled();
    expect(props.onClearSelection).toHaveBeenCalled();
    expect(props.onSearchChange).toHaveBeenCalledWith("ada");
    expect(props.onToggleStudent).toHaveBeenCalledWith(1);
  });

  it("renders error/no-match/unselected states", () => {
    renderPicker({
      selectedStudentIds: [],
      filteredModuleStudents: [],
      studentSearchInput: "   xyz  ",
      moduleStudentsError: "Failed to load students",
    });

    expect(screen.getByText("Failed to load students")).toBeInTheDocument();
    expect(screen.getByText('No students match "xyz".')).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Selected" })).not.toBeInTheDocument();
  });

  it("shows default empty message and loading-disabled controls", () => {
    renderPicker({
      enrolledModuleStudents: [],
      filteredModuleStudents: [],
      selectedStudentIds: [],
      isLoadingModuleStudents: true,
      studentSearchInput: "",
    });

    expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Select all students in module/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Clear selection/i })).toBeDisabled();
    expect(screen.getByText("No enrolled students found for this module.")).toBeInTheDocument();
  });

  it("shows unselected student button when id is not selected", () => {
    renderPicker({ selectedStudentIds: [] });
    const selectButton = screen.getByRole("button", { name: "Select" });
    expect(selectButton).toBeInTheDocument();
    expect(selectButton).toHaveClass("staff-projects__manual-select-btn");
    expect(selectButton).not.toHaveClass("staff-projects__manual-select-btn--active");
  });
});
