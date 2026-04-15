import { act, renderHook, waitFor } from "@testing-library/react";
import type { FormEvent, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffProjectManageSummary } from "@/features/projects/types";
import { PROJECT_NAME_MAX_LENGTH, StaffProjectManageSetupProvider, useStaffProjectManageSetup } from "./StaffProjectManageSetupContext";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

const patchMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("@/features/projects/api/client", () => ({
  patchStaffProjectManage: (...args: unknown[]) => patchMock(...args),
  deleteStaffProjectManage: (...args: unknown[]) => deleteMock(...args),
}));

const initial: StaffProjectManageSummary = {
  id: 7,
  name: "Alpha",
  archivedAt: null,
  moduleId: 3,
  moduleArchivedAt: null,
  questionnaireTemplateId: 2,
  questionnaireTemplate: { id: 2, templateName: "T" },
  projectDeadline: {
    taskOpenDate: "2026-01-01T00:00:00.000Z",
    taskDueDate: "2026-01-15T00:00:00.000Z",
    taskDueDateMcf: "2026-01-22T00:00:00.000Z",
    assessmentOpenDate: "2026-01-16T00:00:00.000Z",
    assessmentDueDate: "2026-01-30T00:00:00.000Z",
    assessmentDueDateMcf: "2026-02-06T00:00:00.000Z",
    feedbackOpenDate: "2026-01-31T00:00:00.000Z",
    feedbackDueDate: "2026-02-14T00:00:00.000Z",
    feedbackDueDateMcf: "2026-02-21T00:00:00.000Z",
    teamAllocationQuestionnaireOpenDate: null,
    teamAllocationQuestionnaireDueDate: null,
  },
  hasSubmittedPeerAssessments: false,
  informationText: null,
  projectAccess: {
    moduleLeaders: [],
    moduleTeachingAssistants: [],
    moduleMemberDirectory: [],
    projectStudentIds: [],
  },
  canMutateProjectSettings: true,
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <StaffProjectManageSetupProvider projectId={7} initial={initial}>
      {children}
    </StaffProjectManageSetupProvider>
  );
}

describe("StaffProjectManageSetupProvider / useStaffProjectManageSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates empty and over-long names", () => {
    const { result } = renderHook(() => useStaffProjectManageSetup(), { wrapper });

    act(() => {
      result.current.setName("   ");
    });
    expect(result.current.nameError).toBe("Project name is required");

    act(() => {
      result.current.setName("x".repeat(PROJECT_NAME_MAX_LENGTH + 1));
    });
    expect(result.current.nameError).toContain(String(PROJECT_NAME_MAX_LENGTH));
  });

  it("submits a trimmed name via patchStaffProjectManage", async () => {
    patchMock.mockResolvedValue({ ...initial, name: "Beta" });
    const { result } = renderHook(() => useStaffProjectManageSetup(), { wrapper });

    act(() => {
      result.current.setName("  Beta  ");
    });

    act(() => {
      result.current.handleSubmitName({ preventDefault: vi.fn() } as unknown as FormEvent);
    });

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith(7, { name: "Beta" });
    });
    await waitFor(() => {
      expect(result.current.savedName).toBe("Beta");
    });
    expect(result.current.detailsSuccess).toBe("Project name saved.");
  });
});
