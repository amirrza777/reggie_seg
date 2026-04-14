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

  it("wires staff and TA search, paging, and toggle callbacks in edit mode", () => {
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
      isEditMode: true,
      currentUserId: null,
      leaderIds: [1],
      leaderSet: new Set([1]),
      staffUsers: [user(1, "Lead"), user(2, "Other")],
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
      taUsers: [user(3, "TA")],
      taIds: [3],
      taSet: new Set([3]),
      taTotal: 1,
      taStart: 1,
      taEnd: 1,
      taPage: 2,
      taPageInput: "2",
      taTotalPages: 3,
    });
    render(<ModuleStaffAccessSection state={state} />);

    const searchBoxes = screen.getAllByRole("searchbox");
    fireEvent.change(searchBoxes[0], { target: { value: "lead" } });
    fireEvent.change(searchBoxes[1], { target: { value: "assistant" } });
    expect(setStaffSearchQuery).toHaveBeenCalledWith("lead");
    expect(setTaSearchQuery).toHaveBeenCalledWith("assistant");

    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]);
    fireEvent.click(switches[1]);
    expect(setStaffSearchOnlyWithoutModuleAccess).toHaveBeenCalledTimes(1);
    expect(setTaSearchOnlyWithoutModuleAccess).toHaveBeenCalledTimes(1);

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[2]);
    expect(toggleLeader).toHaveBeenCalledWith(1, false);
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

  it("renders no-results copy for both leader and TA searches", () => {
    const state = makeState({
      isEditMode: true,
      staffUsers: [],
      staffSearchQuery: "alice",
      staffTotal: 0,
      staffStart: 0,
      staffEnd: 0,
      taUsers: [],
      taSearchQuery: "helper",
      taTotal: 0,
      taStart: 0,
      taEnd: 0,
    });
    render(<ModuleStaffAccessSection state={state} />);
    expect(screen.getByText('No staff match "alice".')).toBeInTheDocument();
    expect(screen.getByText('No accounts match "helper".')).toBeInTheDocument();
  });
});
