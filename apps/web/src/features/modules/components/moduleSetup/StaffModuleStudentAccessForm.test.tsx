import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EnterpriseModuleAccessSelectionResponse } from "@/features/enterprise/types";
import { StaffModuleStudentAccessForm } from "./StaffModuleStudentAccessForm";

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
  return { id, email: `${first}@t.test`, firstName: first, lastName: "S", active: true };
}

function makeHookState(overrides: Record<string, unknown> = {}) {
  return {
    isLoadingAccess: false,
    canEditModule: true,
    errorMessage: null,
    isSubmitting: false,
    isDeleting: false,
    isEditMode: true,
    moduleId: 7,
    leaderIds: [] as number[],
    taIds: [] as number[],
    leaderSet: new Set<number>(),
    taSet: new Set<number>(),
    studentIds: [10, 11],
    studentSet: new Set([10, 11]),
    toggleLeader: vi.fn(),
    toggleTeachingAssistant: vi.fn(),
    toggleStudent: vi.fn(),
    performSubmit: vi.fn().mockResolvedValue(undefined),
    staffSearchQuery: "",
    setStaffSearchQuery: vi.fn(),
    staffUsers: [],
    staffStatus: "idle",
    staffTotal: 0,
    staffStart: 0,
    staffEnd: 0,
    staffMessage: null,
    staffPage: 1,
    staffPageInput: "1",
    staffTotalPages: 0,
    setStaffPage: vi.fn(),
    setStaffPageInput: vi.fn(),
    applyPageInput: vi.fn(),
    staffSearchOnlyWithoutModuleAccess: false,
    setStaffSearchOnlyWithoutModuleAccess: vi.fn(),
    taSearchQuery: "",
    setTaSearchQuery: vi.fn(),
    taUsers: [],
    taStatus: "idle",
    taTotal: 0,
    taStart: 0,
    taEnd: 0,
    taMessage: null,
    taPage: 1,
    taPageInput: "1",
    taTotalPages: 0,
    setTaPage: vi.fn(),
    setTaPageInput: vi.fn(),
    taSearchOnlyWithoutModuleAccess: false,
    setTaSearchOnlyWithoutModuleAccess: vi.fn(),
    studentSearchQuery: "",
    setStudentSearchQuery: vi.fn(),
    studentUsers: [user(10, "Ten"), user(11, "Eleven")],
    studentStatus: "success",
    studentTotal: 2,
    studentStart: 1,
    studentEnd: 2,
    studentMessage: null,
    studentPage: 1,
    studentPageInput: "1",
    studentTotalPages: 1,
    setStudentPage: vi.fn(),
    setStudentPageInput: vi.fn(),
    studentSearchOnlyWithoutModuleAccess: false,
    setStudentSearchOnlyWithoutModuleAccess: vi.fn(),
    ...overrides,
  } as any;
}

const initialAccess: EnterpriseModuleAccessSelectionResponse = {
  module: {
    id: 7,
    name: "Course",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    studentCount: 2,
    leaderCount: 0,
    teachingAssistantCount: 0,
  },
  leaderIds: [],
  taIds: [],
  studentIds: [10],
};

describe("StaffModuleStudentAccessForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("embedded variant shows loading copy", () => {
    useStateMock.mockReturnValue(makeHookState({ isLoadingAccess: true }));
    render(<StaffModuleStudentAccessForm moduleId={7} initialAccessSelection={initialAccess} />);
    expect(screen.getByText("Loading student enrollment…")).toBeInTheDocument();
  });

  it("page variant wraps loading state in page chrome", () => {
    useStateMock.mockReturnValue(makeHookState({ isLoadingAccess: true }));
    render(<StaffModuleStudentAccessForm moduleId={7} initialAccessSelection={initialAccess} variant="page" />);
    expect(screen.getByRole("heading", { name: "Student enrollment" })).toBeInTheDocument();
    expect(screen.getByText("Loading student enrollment…")).toBeInTheDocument();
  });

  it("page variant shows permission error inside card", () => {
    useStateMock.mockReturnValue(makeHookState({ canEditModule: false }));
    render(<StaffModuleStudentAccessForm moduleId={7} initialAccessSelection={initialAccess} variant="page" />);
    expect(
      screen.getByText("Only module owners/leaders can edit student enrollment."),
    ).toBeInTheDocument();
  });

  it("embedded variant shows permission error and custom message", () => {
    useStateMock.mockReturnValue(
      makeHookState({ canEditModule: false, errorMessage: "No permission." })
    );
    render(<StaffModuleStudentAccessForm moduleId={7} initialAccessSelection={initialAccess} />);
    expect(screen.getByText("No permission.")).toBeInTheDocument();
  });

  it("page variant renders full form chrome in edit state", () => {
    useStateMock.mockReturnValue(makeHookState());
    render(<StaffModuleStudentAccessForm moduleId={7} initialAccessSelection={initialAccess} variant="page" />);
    expect(screen.getByText(/Choose which students are enrolled in this module/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review changes" })).toBeInTheDocument();
  });

  it("reviews enrollment diff and saves", () => {
    const performSubmit = vi.fn().mockResolvedValue(undefined);
    useStateMock.mockReturnValue(makeHookState({ performSubmit }));
    render(<StaffModuleStudentAccessForm moduleId={7} initialAccessSelection={initialAccess} />);
    fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
    expect(screen.getByText("Enroll — add (1)")).toBeInTheDocument();
    expect(screen.getByText(/Eleven/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm and save" }));
    expect(performSubmit).toHaveBeenCalled();
  });

  it("disables review action when there are no changes", () => {
    useStateMock.mockReturnValue(makeHookState({ studentIds: [10], studentSet: new Set([10]) }));
    render(<StaffModuleStudentAccessForm moduleId={7} initialAccessSelection={initialAccess} />);
    expect(screen.getByRole("button", { name: "Review changes" })).toBeDisabled();
  });

  it("shows removal review summary and review-step error", () => {
    const state = makeHookState({
      studentIds: [],
      studentSet: new Set<number>(),
      errorMessage: "Failed to save",
    });
    useStateMock.mockReturnValue(state);
    render(<StaffModuleStudentAccessForm moduleId={7} initialAccessSelection={initialAccess} />);
    fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
    expect(screen.getByText("Enroll — remove (1)")).toBeInTheDocument();
    expect(screen.getByText(/Ten S/)).toBeInTheDocument();
    expect(screen.getByText("Failed to save")).toBeInTheDocument();
  });

  it("returns from review step back to editing", () => {
    useStateMock.mockReturnValue(makeHookState());
    render(<StaffModuleStudentAccessForm moduleId={7} initialAccessSelection={initialAccess} />);
    fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to editing" }));
    expect(screen.getByRole("button", { name: "Review changes" })).toBeInTheDocument();
  });

  it("uses email and id fallback labels in review when names are unavailable", () => {
    useStateMock.mockReturnValue(
      makeHookState({
        studentIds: [10, 12, 99],
        studentSet: new Set([10, 12, 99]),
        studentUsers: [user(10, "Ten"), { id: 12, firstName: "", lastName: "", email: "fallback@test", active: true }],
      })
    );
    render(<StaffModuleStudentAccessForm moduleId={7} initialAccessSelection={initialAccess} />);
    fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
    expect(screen.getByText("fallback@test")).toBeInTheDocument();
    expect(screen.getByText("User ID 99")).toBeInTheDocument();
  });

  it("renders no-results search copy when no students match query", () => {
    useStateMock.mockReturnValue(
      makeHookState({
        studentUsers: [],
        studentSearchQuery: "abc",
        studentIds: [10],
        studentSet: new Set([10]),
        studentTotal: 0,
        studentStart: 0,
        studentEnd: 0,
      })
    );
    render(<StaffModuleStudentAccessForm moduleId={7} initialAccessSelection={initialAccess} />);
    expect(screen.getByText('No students match "abc".')).toBeInTheDocument();
  });

  it("shows edit-step error and wires search/filter/pagination callbacks", () => {
    const setStudentPage = vi.fn();
    const setStudentPageInput = vi.fn();
    const applyPageInput = vi.fn();
    const setStudentSearchOnlyWithoutModuleAccess = vi.fn();
    const toggleStudent = vi.fn();
    const setStudentSearchQuery = vi.fn();
    useStateMock.mockReturnValue(
      makeHookState({
        errorMessage: "Something went wrong",
        studentTotalPages: 3,
        studentPage: 2,
        studentPageInput: "2",
        setStudentPage,
        setStudentPageInput,
        applyPageInput,
        setStudentSearchOnlyWithoutModuleAccess,
        toggleStudent,
        setStudentSearchQuery,
      })
    );

    render(<StaffModuleStudentAccessForm moduleId={7} initialAccessSelection={initialAccess} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Students" }), {
      target: { value: "ten" },
    });
    expect(setStudentSearchQuery).toHaveBeenCalledWith("ten");

    fireEvent.click(screen.getByRole("switch", { name: /hide users already on this module/i }));
    expect(setStudentSearchOnlyWithoutModuleAccess).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("checkbox", { name: /Ten S/i }));
    expect(toggleStudent).toHaveBeenCalledWith(10, false);

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(setStudentPage).toHaveBeenCalledTimes(2);

    const pageInput = screen.getByRole("spinbutton", { name: "Go to student page" });
    fireEvent.change(pageInput, { target: { value: "3" } });
    fireEvent.blur(pageInput);
    expect(setStudentPageInput).toHaveBeenCalledWith("3");
    expect(applyPageInput).toHaveBeenCalledWith("students", "2");

    fireEvent.submit(pageInput.closest("form")!);
    expect(applyPageInput).toHaveBeenCalledTimes(2);
  });

  it("cancel returns to students route", () => {
    useStateMock.mockReturnValue(makeHookState());
    render(<StaffModuleStudentAccessForm moduleId={7} initialAccessSelection={initialAccess} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(pushMock).toHaveBeenCalledWith("/staff/modules/7/students");
  });
});
