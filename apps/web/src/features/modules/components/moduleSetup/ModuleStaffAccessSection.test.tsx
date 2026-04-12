import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EnterpriseAssignableUser } from "@/features/enterprise/types";
import { ModuleStaffAccessSection } from "./ModuleStaffAccessSection";

function user(id: number, firstName: string): EnterpriseAssignableUser {
  return { id, email: `${firstName.toLowerCase()}@x.test`, firstName, lastName: "User", active: true };
}

function makeState(overrides: Record<string, unknown> = {}) {
  const u1 = user(1, "Lead");
  return {
    isEditMode: false,
    moduleId: 5 as number | null,
    isSubmitting: false,
    isDeleting: false,
    leaderIds: [] as number[],
    taIds: [] as number[],
    leaderSet: new Set<number>(),
    taSet: new Set<number>(),
    toggleLeader: vi.fn(),
    toggleTeachingAssistant: vi.fn(),
    staffSearchQuery: "",
    setStaffSearchQuery: vi.fn(),
    staffUsers: [u1],
    staffStatus: "success" as const,
    staffTotal: 1,
    staffStart: 1,
    staffEnd: 1,
    staffMessage: null,
    staffPage: 1,
    staffPageInput: "1",
    staffTotalPages: 1,
    setStaffPage: vi.fn(),
    setStaffPageInput: vi.fn(),
    applyPageInput: vi.fn(),
    staffSearchOnlyWithoutModuleAccess: false,
    setStaffSearchOnlyWithoutModuleAccess: vi.fn(),
    taSearchQuery: "",
    setTaSearchQuery: vi.fn(),
    taUsers: [] as EnterpriseAssignableUser[],
    taStatus: "success" as const,
    taTotal: 0,
    taStart: 0,
    taEnd: 0,
    taMessage: null,
    taPage: 1,
    taPageInput: "1",
    taTotalPages: 0,
    setTaPage: vi.fn(),
    setTaPageInput: vi.fn(),
    ...overrides,
  } as any;
}

describe("ModuleStaffAccessSection", () => {
  it("shows validation hint when not in edit mode and no module leader is selected", () => {
    render(<ModuleStaffAccessSection state={makeState()} />);
    expect(screen.getByText("Select at least one module leader to continue.")).toBeInTheDocument();
  });

  it("renders teaching assistant column in edit mode", () => {
    render(<ModuleStaffAccessSection state={makeState({ isEditMode: true, leaderIds: [1], leaderSet: new Set([1]) })} />);
    expect(screen.getByText("Teaching assistants")).toBeInTheDocument();
  });

  it("disables unchecking the signed-in leader row and still toggles other leaders", () => {
    const toggleLeader = vi.fn();
    const state = makeState({
      isEditMode: true,
      leaderIds: [1, 2],
      leaderSet: new Set([1, 2]),
      staffUsers: [user(1, "Self"), user(2, "Other")],
      toggleLeader,
    });
    render(<ModuleStaffAccessSection state={state} currentUserId={1} />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeDisabled();
    fireEvent.change(checkboxes[0], { target: { checked: false } });
    expect(toggleLeader).not.toHaveBeenCalled();
    fireEvent.click(checkboxes[1]!);
    expect(toggleLeader).toHaveBeenCalledWith(2, false);
  });
});
