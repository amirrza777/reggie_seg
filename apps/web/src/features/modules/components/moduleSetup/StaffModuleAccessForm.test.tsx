import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { EnterpriseModuleAccessSelectionResponse } from "@/features/enterprise/types";
import { StaffModuleAccessForm } from "./StaffModuleAccessForm";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/features/enterprise/components/useEnterpriseModuleCreateFormState", () => ({
  useEnterpriseModuleCreateFormState: vi.fn(),
}));

import { useEnterpriseModuleCreateFormState } from "@/features/enterprise/components/useEnterpriseModuleCreateFormState";

const useStateMock = vi.mocked(useEnterpriseModuleCreateFormState);

function user(id: number, first: string) {
  return { id, email: `${first}@t.test`, firstName: first, lastName: "L", active: true };
}

function makeHookState(overrides: Record<string, unknown> = {}) {
  return {
    isLoadingAccess: false,
    canEditModule: true,
    errorMessage: null,
    isSubmitting: false,
    isDeleting: false,
    isEditMode: true,
    moduleId: 42,
    leaderIds: [1, 2],
    taIds: [3],
    leaderSet: new Set([1, 2]),
    taSet: new Set([3]),
    studentIds: [] as number[],
    studentSet: new Set<number>(),
    toggleLeader: vi.fn(),
    toggleTeachingAssistant: vi.fn(),
    toggleStudent: vi.fn(),
    performSubmit: vi.fn().mockResolvedValue(undefined),
    staffSearchQuery: "",
    setStaffSearchQuery: vi.fn(),
    staffUsers: [user(1, "A"), user(2, "B")],
    staffStatus: "success",
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
    taUsers: [user(3, "C")],
    taStatus: "success",
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
    studentSearchQuery: "",
    setStudentSearchQuery: vi.fn(),
    studentUsers: [],
    studentStatus: "idle",
    studentTotal: 0,
    studentStart: 0,
    studentEnd: 0,
    studentMessage: null,
    studentPage: 1,
    studentPageInput: "1",
    studentTotalPages: 0,
    setStudentPage: vi.fn(),
    setStudentPageInput: vi.fn(),
    studentSearchOnlyWithoutModuleAccess: false,
    setStudentSearchOnlyWithoutModuleAccess: vi.fn(),
    ...overrides,
  } as any;
}

const initialAccess: EnterpriseModuleAccessSelectionResponse = {
  module: {
    id: 42,
    name: "Mod",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    studentCount: 0,
    leaderCount: 1,
    teachingAssistantCount: 1,
  },
  leaderIds: [1],
  taIds: [3],
  studentIds: [],
};

describe("StaffModuleAccessForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading copy while access selection is loading", () => {
    useStateMock.mockReturnValue(makeHookState({ isLoadingAccess: true }));
    render(<StaffModuleAccessForm moduleId={42} currentUserId={1} initialAccessSelection={initialAccess} />);
    expect(screen.getByText("Loading staff access…")).toBeInTheDocument();
  });

  it("shows error when the editor cannot manage module access", () => {
    useStateMock.mockReturnValue(
      makeHookState({ canEditModule: false, errorMessage: "Not allowed" }),
    );
    render(<StaffModuleAccessForm moduleId={42} currentUserId={1} initialAccessSelection={initialAccess} />);
    expect(screen.getByText("Not allowed")).toBeInTheDocument();
  });

  it("shows default permission error copy when no custom message is provided", () => {
    useStateMock.mockReturnValue(makeHookState({ canEditModule: false, errorMessage: null }));
    render(<StaffModuleAccessForm moduleId={42} currentUserId={1} initialAccessSelection={initialAccess} />);
    expect(screen.getByText("Only module owners/leaders can edit staff access.")).toBeInTheDocument();
  });

  it("moves between edit and review and invokes performSubmit on confirm", () => {
    const performSubmit = vi.fn().mockResolvedValue(undefined);
    useStateMock.mockReturnValue(makeHookState({ performSubmit }));
    render(<StaffModuleAccessForm moduleId={42} currentUserId={1} initialAccessSelection={initialAccess} />);
    fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
    expect(screen.getByText("Confirm staff access changes")).toBeInTheDocument();
    expect(screen.getByText("Module leads — add (1)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm and save" }));
    expect(performSubmit).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Back to editing" }));
    expect(screen.getByRole("button", { name: "Review changes" })).toBeInTheDocument();
  });

  it("navigates back to staff list on cancel", () => {
    useStateMock.mockReturnValue(makeHookState());
    render(<StaffModuleAccessForm moduleId={42} currentUserId={1} initialAccessSelection={initialAccess} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(pushMock).toHaveBeenCalledWith("/staff/modules/42/staff");
  });

  it("shows edit and review error banners when the state has an error message", () => {
    useStateMock.mockReturnValue(makeHookState({ errorMessage: "Validation failed" }));
    render(<StaffModuleAccessForm moduleId={42} currentUserId={1} initialAccessSelection={initialAccess} />);
    expect(screen.getByText("Validation failed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
    expect(screen.getByText("Validation failed")).toBeInTheDocument();
  });

  it("uses fallback labels in review when names are missing and ids are unknown", () => {
    useStateMock.mockReturnValue(
      makeHookState({
        leaderIds: [1, 4],
        leaderSet: new Set([1, 4]),
        taIds: [3, 99],
        taSet: new Set([3, 99]),
        staffUsers: [user(1, "A"), { id: 4, firstName: "", lastName: "", email: "lead-fallback@test", active: true }],
        taUsers: [user(3, "C"), { id: 99, firstName: "", lastName: "", email: "", active: true }],
      })
    );
    render(<StaffModuleAccessForm moduleId={42} currentUserId={1} initialAccessSelection={initialAccess} />);
    fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
    expect(screen.getByText("lead-fallback@test")).toBeInTheDocument();
    expect(screen.getByText("User ID 99")).toBeInTheDocument();
  });

  it("shows saving label in review when submission state flips to loading", () => {
    useStateMock
      .mockReturnValueOnce(makeHookState({ isSubmitting: false }))
      .mockReturnValue(makeHookState({ isSubmitting: true }));
    render(<StaffModuleAccessForm moduleId={42} currentUserId={1} initialAccessSelection={initialAccess} />);
    fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
