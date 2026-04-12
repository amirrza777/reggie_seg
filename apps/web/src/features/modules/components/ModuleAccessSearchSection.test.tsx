import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EnterpriseAssignableUser } from "@/features/enterprise/types";
import { ModuleAccessSearchSection, type ModuleAccessSearchSectionProps } from "./ModuleAccessSearchSection";

function user(overrides: Partial<EnterpriseAssignableUser> = {}): EnterpriseAssignableUser {
  return {
    id: 1,
    email: "a@b.test",
    firstName: "Ann",
    lastName: "Bee",
    active: true,
    ...overrides,
  };
}

function makeProps(overrides: Partial<ModuleAccessSearchSectionProps> = {}): ModuleAccessSearchSectionProps {
  return {
    label: "Staff search",
    helperText: "Pick accounts.",
    groupLabel: "Staff",
    searchId: "search-1",
    searchAriaLabel: "Search staff",
    searchPlaceholder: "Search…",
    searchQuery: "",
    onSearchChange: vi.fn(),
    status: "success",
    total: 2,
    start: 1,
    end: 2,
    users: [user({ id: 1 }), user({ id: 2, firstName: "Bob", email: "bob@b.test", active: false })],
    selectedSet: new Set([1]),
    onToggle: vi.fn(),
    message: null,
    page: 1,
    pageInput: "1",
    totalPages: 2,
    pageInputId: "page-in",
    pageJumpAriaLabel: "Jump page",
    onPageInputChange: vi.fn(),
    onPageInputBlur: vi.fn(),
    onCommitPageJump: vi.fn(),
    onPreviousPage: vi.fn(),
    onNextPage: vi.fn(),
    loadingLabel: "Loading…",
    zeroLabel: "Zero accounts",
    noResultsLabel: (q) => `No hit for "${q}"`,
    emptyLabel: "Nobody here",
    selectedCountLabel: "1 selected",
    onlyWithoutModuleAccess: false,
    onToggleOnlyWithoutModuleAccess: vi.fn(),
    onlyWithoutModuleAccessDisabled: false,
    ...overrides,
  };
}

describe("ModuleAccessSearchSection", () => {
  it("shows loading summary when status is loading and total is zero", () => {
    render(
      <ModuleAccessSearchSection
        {...makeProps({ status: "loading", total: 0, start: 0, end: 0, users: [], totalPages: 1 })}
      />,
    );
    expect(screen.getAllByText("Loading…").length).toBeGreaterThanOrEqual(1);
  });

  it("shows zero label when not loading and total is zero", () => {
    render(
      <ModuleAccessSearchSection {...makeProps({ total: 0, start: 0, end: 0, users: [], totalPages: 1 })} />,
    );
    expect(screen.getByText("Zero accounts")).toBeInTheDocument();
  });

  it("shows range summary for populated results", () => {
    render(<ModuleAccessSearchSection {...makeProps()} />);
    expect(screen.getByText("Showing 1-2 of 2 accounts")).toBeInTheDocument();
  });

  it("invokes onToggle when a row checkbox changes", () => {
    const onToggle = vi.fn();
    render(<ModuleAccessSearchSection {...makeProps({ onToggle })} />);
    const bob = screen.getByRole("checkbox", { name: /Bob Bee/i });
    fireEvent.click(bob);
    expect(onToggle).toHaveBeenCalledWith(2, true);
  });

  it("applies pending removal styling when baseline had the user but they are unchecked", () => {
    const { container } = render(
      <ModuleAccessSearchSection {...makeProps({ baselineSelectedSet: new Set([2]), selectedSet: new Set([1]) })} />,
    );
    expect(container.querySelector(".is-pending-removal")).toBeTruthy();
  });

  it("shows no-results vs empty copy when the user list is empty", () => {
    const { rerender } = render(
      <ModuleAccessSearchSection
        {...makeProps({ users: [], total: 0, start: 0, end: 0, searchQuery: "  xyz  ", totalPages: 1 })}
      />,
    );
    expect(screen.getByText('No hit for "xyz"')).toBeInTheDocument();
    rerender(
      <ModuleAccessSearchSection {...makeProps({ users: [], total: 0, start: 0, end: 0, searchQuery: "", totalPages: 1 })} />,
    );
    expect(screen.getByText("Nobody here")).toBeInTheDocument();
  });

  it("shows loading placeholder in empty list while status is loading", () => {
    render(
      <ModuleAccessSearchSection
        {...makeProps({
          users: [],
          total: 0,
          start: 0,
          end: 0,
          status: "loading",
          searchQuery: "q",
          totalPages: 1,
        })}
      />,
    );
    expect(screen.getAllByText("Loading…").length).toBeGreaterThanOrEqual(1);
  });

  it("renders API error message and wires filter switch", () => {
    const onToggleOnly = vi.fn();
    render(
      <ModuleAccessSearchSection {...makeProps({ message: "Search failed", onToggleOnlyWithoutModuleAccess: onToggleOnly })} />,
    );
    expect(screen.getByText("Search failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch"));
    expect(onToggleOnly).toHaveBeenCalled();
  });

  it("disables filter switch when requested", () => {
    render(
      <ModuleAccessSearchSection {...makeProps({ onlyWithoutModuleAccessDisabled: true })} />,
    );
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("respects isCheckedDisabled and runs pagination actions when totalPages > 1", () => {
    const onPreviousPage = vi.fn();
    const onNextPage = vi.fn();
    const onCommitPageJump = vi.fn();
    render(
      <ModuleAccessSearchSection
        {...makeProps({
          page: 2,
          totalPages: 3,
          onPreviousPage,
          onNextPage,
          onCommitPageJump,
          isCheckedDisabled: (u) => u.id === 1,
        })}
      />,
    );
    expect(screen.getByRole("checkbox", { name: /Ann Bee/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPreviousPage).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onNextPage).toHaveBeenCalled();
    const pageJumpForm = screen.getByLabelText("Jump page").closest("form");
    expect(pageJumpForm).toBeTruthy();
    fireEvent.submit(pageJumpForm!);
    expect(onCommitPageJump).toHaveBeenCalled();
  });
});
