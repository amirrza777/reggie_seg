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

  it("wires leaders and TA callbacks for search filters and pagination", () => {
    const setStaffSearchQuery = vi.fn();
    const setTaSearchQuery = vi.fn();
    const setStaffSearchOnlyWithoutModuleAccess = vi.fn();
    const setTaSearchOnlyWithoutModuleAccess = vi.fn();
    const setStaffPage = vi.fn();
    const setTaPage = vi.fn();
    const setStaffPageInput = vi.fn();
    const setTaPageInput = vi.fn();
    const applyPageInput = vi.fn();
    const toggleLeader = vi.fn();
    const toggleTeachingAssistant = vi.fn();
    const state = makeState({
      setStaffSearchQuery,
      setTaSearchQuery,
      setStaffSearchOnlyWithoutModuleAccess,
      setTaSearchOnlyWithoutModuleAccess,
      setStaffPage,
      setTaPage,
      setStaffPageInput,
      setTaPageInput,
      applyPageInput,
      toggleLeader,
      toggleTeachingAssistant,
      staffPage: 2,
      staffPageInput: "2",
      staffTotalPages: 3,
      taPage: 2,
      taPageInput: "2",
      taTotalPages: 3,
    });

    render(
      <StaffModuleAccessTwoColumnSection
        state={state}
        baselineLeaderSet={new Set([1])}
        baselineTaSet={new Set([3])}
        currentUserId={1}
      />,
    );

    const searchBoxes = screen.getAllByRole("searchbox");
    fireEvent.change(searchBoxes[0], { target: { value: "leaders" } });
    fireEvent.change(searchBoxes[1], { target: { value: "tas" } });
    expect(setStaffSearchQuery).toHaveBeenCalledWith("leaders");
    expect(setTaSearchQuery).toHaveBeenCalledWith("tas");

    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]);
    fireEvent.click(switches[1]);
    expect(setStaffSearchOnlyWithoutModuleAccess).toHaveBeenCalledTimes(1);
    expect(setTaSearchOnlyWithoutModuleAccess).toHaveBeenCalledTimes(1);

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);
    expect(toggleLeader).toHaveBeenCalledWith(2, false);
    expect(toggleTeachingAssistant).toHaveBeenCalledWith(3, false);

    const previousButtons = screen.getAllByRole("button", { name: "Previous" });
    const nextButtons = screen.getAllByRole("button", { name: "Next" });
    fireEvent.click(previousButtons[0]);
    fireEvent.click(previousButtons[1]);
    fireEvent.click(nextButtons[0]);
    fireEvent.click(nextButtons[1]);
    expect(setStaffPage).toHaveBeenCalledTimes(2);
    expect(setTaPage).toHaveBeenCalledTimes(2);

    const pageInputs = screen.getAllByRole("spinbutton");
    fireEvent.change(pageInputs[0], { target: { value: "3" } });
    fireEvent.change(pageInputs[1], { target: { value: "3" } });
    fireEvent.blur(pageInputs[0]);
    fireEvent.blur(pageInputs[1]);
    fireEvent.submit(pageInputs[0].closest("form")!);
    fireEvent.submit(pageInputs[1].closest("form")!);
    expect(setStaffPageInput).toHaveBeenCalledWith("3");
    expect(setTaPageInput).toHaveBeenCalledWith("3");
    expect(applyPageInput).toHaveBeenCalledWith("staff", "2");
    expect(applyPageInput).toHaveBeenCalledWith("ta", "2");
  });

  it("renders no-results text for both columns", () => {
    const state = makeState({
      staffUsers: [],
      staffSearchQuery: "owner",
      staffTotal: 0,
      staffStart: 0,
      staffEnd: 0,
      taUsers: [],
      taSearchQuery: "assistant",
      taTotal: 0,
      taStart: 0,
      taEnd: 0,
    });
    render(
      <StaffModuleAccessTwoColumnSection
        state={state}
        baselineLeaderSet={new Set<number>()}
        baselineTaSet={new Set<number>()}
        currentUserId={1}
      />,
    );
    expect(screen.getByText('No staff match "owner".')).toBeInTheDocument();
    expect(screen.getByText('No accounts match "assistant".')).toBeInTheDocument();
  });

  it("allows selecting the current user when they are not already a leader", () => {
    const toggleLeader = vi.fn();
    const state = makeState({
      leaderIds: [2],
      leaderSet: new Set([2]),
      toggleLeader,
    });
    render(
      <StaffModuleAccessTwoColumnSection
        state={state}
        baselineLeaderSet={new Set([2])}
        baselineTaSet={new Set([3])}
        currentUserId={1}
      />,
    );
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).not.toBeDisabled();
    fireEvent.click(checkboxes[0]);
    expect(toggleLeader).toHaveBeenCalledWith(1, true);
  });
});
