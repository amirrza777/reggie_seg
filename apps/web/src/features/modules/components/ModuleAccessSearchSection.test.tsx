import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { EnterpriseAssignableUser } from "@/features/enterprise/types";
import { ModuleAccessSearchSection } from "./ModuleAccessSearchSection";

function createUser(overrides: Partial<EnterpriseAssignableUser> = {}): EnterpriseAssignableUser {
  return {
    id: 1,
    email: "student@example.com",
    firstName: "Stu",
    lastName: "Dent",
    active: true,
    ...overrides,
  };
}

function createProps(
  overrides: Partial<ComponentProps<typeof ModuleAccessSearchSection>> = {},
): ComponentProps<typeof ModuleAccessSearchSection> {
  return {
    label: "Students",
    helperText: "Search and select students.",
    groupLabel: "Student accounts",
    searchId: "students-search",
    searchAriaLabel: "Search students",
    searchPlaceholder: "Search students",
    searchQuery: "",
    onSearchChange: vi.fn(),
    status: "success",
    total: 1,
    start: 1,
    end: 1,
    users: [createUser()],
    selectedSet: new Set<number>(),
    onToggle: vi.fn(),
    isCheckedDisabled: vi.fn(() => false),
    message: null,
    page: 2,
    pageInput: "2",
    totalPages: 3,
    pageInputId: "students-page-input",
    pageJumpAriaLabel: "Go to students page",
    onPageInputChange: vi.fn(),
    onPageInputBlur: vi.fn(),
    onCommitPageJump: vi.fn(),
    onPreviousPage: vi.fn(),
    onNextPage: vi.fn(),
    loadingLabel: "Loading students...",
    zeroLabel: "No students yet.",
    noResultsLabel: (query: string) => `No users match "${query}"`,
    emptyLabel: "No users to show.",
    selectedCountLabel: "0 selected",
    baselineSelectedSet: new Set<number>([1]),
    onlyWithoutModuleAccess: false,
    onToggleOnlyWithoutModuleAccess: vi.fn(),
    onlyWithoutModuleAccessDisabled: false,
    ...overrides,
  };
}

describe("ModuleAccessSearchSection", () => {
  it("renders items and wires search, selection, switch, and pagination handlers", () => {
    const props = createProps();
    render(<ModuleAccessSearchSection {...props} />);

    expect(screen.getByText("Search and select students.")).toBeInTheDocument();
    expect(screen.getByText("Showing 1-1 of 1 accounts")).toBeInTheDocument();
    expect(screen.getByText("0 selected")).toBeInTheDocument();

    const searchInput = screen.getByRole("searchbox");
    fireEvent.change(searchInput, { target: { value: "amy" } });
    expect(props.onSearchChange).toHaveBeenCalledWith("amy");

    fireEvent.click(screen.getByRole("switch", { name: "Hide users already on this module" }));
    expect(props.onToggleOnlyWithoutModuleAccess).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("checkbox"));
    expect(props.onToggle).toHaveBeenCalledWith(1, true);

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(props.onPreviousPage).toHaveBeenCalledTimes(1);
    expect(props.onNextPage).toHaveBeenCalledTimes(1);

    const pageInput = screen.getByRole("spinbutton", { name: "Go to students page" });
    fireEvent.change(pageInput, { target: { value: "3" } });
    fireEvent.blur(pageInput);
    fireEvent.submit(pageInput.closest("form") as HTMLFormElement);
    expect(props.onPageInputChange).toHaveBeenCalledWith("3");
    expect(props.onPageInputBlur).toHaveBeenCalledTimes(1);
    expect(props.onCommitPageJump).toHaveBeenCalledTimes(1);
  });

  it("renders empty/loading/result messages and field-level errors", () => {
    const noResultsLabel = vi.fn((query: string) => `No users match "${query}"`);
    const { rerender } = render(
      <ModuleAccessSearchSection
        {...createProps({
          users: [],
          status: "loading",
          total: 0,
          start: 0,
          end: 0,
        })}
      />,
    );
    expect(screen.getAllByText("Loading students...").length).toBeGreaterThan(0);

    rerender(
      <ModuleAccessSearchSection
        {...createProps({
          users: [],
          status: "success",
          total: 0,
          start: 0,
          end: 0,
          searchQuery: "  alex ",
          noResultsLabel,
          message: "Could not update access",
        })}
      />,
    );
    expect(screen.getByText('No users match "alex"')).toBeInTheDocument();
    expect(noResultsLabel).toHaveBeenCalledWith("alex");
    expect(screen.getByText("Could not update access")).toBeInTheDocument();

    rerender(
      <ModuleAccessSearchSection
        {...createProps({
          users: [],
          status: "success",
          total: 0,
          start: 0,
          end: 0,
          searchQuery: "",
        })}
      />,
    );
    expect(screen.getByText("No users to show.")).toBeInTheDocument();
  });
});
