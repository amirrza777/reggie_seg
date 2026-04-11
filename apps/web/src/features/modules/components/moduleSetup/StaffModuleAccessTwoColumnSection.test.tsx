import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EnterpriseAssignableUser } from "@/features/enterprise/types";
import { StaffModuleAccessTwoColumnSection } from "./StaffModuleAccessTwoColumnSection";

function user(id: number, firstName: string): EnterpriseAssignableUser {
  return { id, email: `${firstName.toLowerCase()}@x.test`, firstName, lastName: "User", active: true };
}

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    moduleId: 9 as number | null,
    isSubmitting: false,
    isDeleting: false,
    leaderIds: [1, 2],
    taIds: [3],
    leaderSet: new Set([1, 2]),
    taSet: new Set([3]),
    toggleLeader: vi.fn(),
    toggleTeachingAssistant: vi.fn(),
    staffSearchQuery: "",
    setStaffSearchQuery: vi.fn(),
    staffUsers: [user(1, "Self"), user(2, "Other")],
    staffStatus: "success" as const,
    staffTotal: 2,
    staffStart: 1,
    staffEnd: 2,
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
    taUsers: [user(3, "TA")],
    taStatus: "success" as const,
    taTotal: 1,
    taStart: 1,
    taEnd: 1,
    taMessage: null,
    taPage: 1,
    taPageInput: "1",
    taTotalPages: 1,
    setTaPage: vi.fn(),
    setTaPageInput: vi.fn(),
    taSearchOnlyWithoutModuleAccess: false,
    setTaSearchOnlyWithoutModuleAccess: vi.fn(),
    ...overrides,
  } as any;
}

describe("StaffModuleAccessTwoColumnSection", () => {
  it("renders leaders and teaching assistants search sections", () => {
    const state = makeState();
    render(
      <StaffModuleAccessTwoColumnSection
        state={state}
        baselineLeaderSet={new Set([1])}
        baselineTaSet={new Set()}
        currentUserId={1}
      />,
    );
    expect(screen.getByText("Module owners/leaders")).toBeInTheDocument();
    expect(screen.getByText("Teaching assistants")).toBeInTheDocument();
  });

  it("does not forward leader toggle when the editor tries to remove themselves", () => {
    const toggleLeader = vi.fn();
    const state = makeState({ toggleLeader });
    render(
      <StaffModuleAccessTwoColumnSection
        state={state}
        baselineLeaderSet={new Set([1, 2])}
        baselineTaSet={new Set([3])}
        currentUserId={1}
      />,
    );
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeDisabled();
    fireEvent.change(checkboxes[0], { target: { checked: false } });
    expect(toggleLeader).not.toHaveBeenCalled();
  });
});
