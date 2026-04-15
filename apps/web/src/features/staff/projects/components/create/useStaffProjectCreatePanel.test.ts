import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getModuleStudents } from "@/features/modules/api/client";
import { getMyQuestionnaires } from "@/features/questionnaires/api/client";
import { useStaffProjectCreatePanel } from "./useStaffProjectCreatePanel";
import { loadProjectPeerTemplates } from "./StaffProjectCreatePanel.templates";
import { applyMcfOffsetDaysToDeadlineState } from "./StaffProjectCreatePanel.deadlines";
import { submitCreateProject } from "./StaffProjectCreatePanel.submit";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("@/shared/lib/search", () => ({
  SEARCH_DEBOUNCE_MS: 0,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("@/features/modules/api/client", () => ({
  getModuleStudents: vi.fn(),
}));

vi.mock("@/features/questionnaires/api/client", () => ({
  getMyQuestionnaires: vi.fn(),
}));

vi.mock("./StaffProjectCreatePanel.templates", () => ({
  loadProjectPeerTemplates: vi.fn(),
}));

vi.mock("./StaffProjectCreatePanel.deadlines", async () => {
  const actual = await vi.importActual("./StaffProjectCreatePanel.deadlines");
  return {
    ...actual,
    applyMcfOffsetDaysToDeadlineState: vi.fn(),
  };
});

vi.mock("./StaffProjectCreatePanel.submit", () => ({
  submitCreateProject: vi.fn(),
}));

const getModuleStudentsMock = vi.mocked(getModuleStudents);
const getMyQuestionnairesMock = vi.mocked(getMyQuestionnaires);
const loadProjectPeerTemplatesMock = vi.mocked(loadProjectPeerTemplates);
const applyMcfOffsetDaysToDeadlineStateMock = vi.mocked(applyMcfOffsetDaysToDeadlineState);
const submitCreateProjectMock = vi.mocked(submitCreateProject);

const modules = [
  { id: 5, title: "SEG", accountRole: "OWNER" },
  { id: 6, title: "Other", accountRole: "STUDENT_ACCESS" },
] as any;

describe("useStaffProjectCreatePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushMock.mockReset();
    refreshMock.mockReset();

    getModuleStudentsMock.mockResolvedValue({
      students: [
        { id: 11, firstName: "Alex", lastName: "Doe", email: "alex@example.com", active: true, enrolled: true },
        { id: 12, firstName: "Sam", lastName: "Roe", email: "sam@example.com", active: false, enrolled: true },
      ],
    } as any);

    getMyQuestionnairesMock.mockImplementation(async (options?: { purpose?: string }) => {
      const list = [
        { id: 11, templateName: "Peer", purpose: "PEER_ASSESSMENT" },
        { id: 22, templateName: "Allocation", purpose: "CUSTOMISED_ALLOCATION" },
        { id: 33, templateName: "General", purpose: "GENERAL_PURPOSE" },
      ];
      if (options?.purpose === "PEER_ASSESSMENT") {
        return list.filter((t) => t.purpose === "PEER_ASSESSMENT") as any;
      }
      if (options?.purpose === "CUSTOMISED_ALLOCATION") {
        return list.filter((t) => t.purpose === "CUSTOMISED_ALLOCATION") as any;
      }
      return list as any;
    });

    loadProjectPeerTemplatesMock.mockImplementation(async (args: any) => {
      args.setTemplates([{ id: 11, templateName: "Peer", purpose: "PEER_ASSESSMENT" }]);
      args.setTemplatesError(null);
      args.setIsLoadingTemplates(false);
    });

    applyMcfOffsetDaysToDeadlineStateMock.mockReturnValue({
      ok: true,
      value: {
        taskDueDateMcf: "2026-05-01T09:00",
        assessmentDueDateMcf: "2026-05-08T09:00",
        feedbackDueDateMcf: "2026-05-15T09:00",
      },
    } as any);

    submitCreateProjectMock.mockResolvedValue({
      ok: true,
      createdName: "Project",
      createdProjectId: 88,
      createdModuleId: 5,
      hasAllocationTemplate: false,
    } as any);
  });

  it("loads templates/students and supports student + schedule controls", async () => {
    const { result } = renderHook(() =>
      useStaffProjectCreatePanel({
        modules,
        modulesError: null,
        initialModuleId: "999",
      }),
    );

    await waitFor(() => expect(result.current.isLoadingTemplates).toBe(false));
    await waitFor(() => expect(result.current.moduleId).toBe("5"));
    await waitFor(() => expect(result.current.selectedStudentIds).toEqual([11]));

    act(() => {
      result.current.handleStudentSearchChange("alex");
    });
    expect(result.current.filteredModuleStudents).toHaveLength(1);

    act(() => {
      result.current.clearSelectedModuleStudents();
      result.current.toggleStudentSelection(11);
      result.current.selectAllModuleStudents();
    });
    expect(result.current.selectedStudentIds).toEqual([11]);

    applyMcfOffsetDaysToDeadlineStateMock.mockReturnValueOnce({ ok: false, error: "bad mcf" } as any);
    act(() => {
      result.current.applyMcfOffsetDays(7);
    });
    expect(result.current.deadlinePresetError).toBe("bad mcf");

    act(() => {
      result.current.setAllocationTemplateId("22");
    });

    await waitFor(() => expect(result.current.hasSelectedAllocationTemplate).toBe(true));

    act(() => {
      result.current.applyMcfOffsetDays(7);
      result.current.applySchedulePreset(6);
    });
    expect(result.current.deadlinePresetStatus).toBe(
      "Applied 6-week schedule and shifted for team allocation.",
    );

    act(() => {
      result.current.resetSchedulePreset();
      result.current.refreshModuleStudents();
    });

    await waitFor(() =>
      expect(result.current.deadlinePresetStatus).toBe(
        "Reset to default schedule and shifted for team allocation.",
      ),
    );
    expect(typeof result.current.canSubmit).toBe("boolean");
    expect(getModuleStudentsMock).toHaveBeenCalled();
  });

  it("handles allocation-template load failures", async () => {
    getMyQuestionnairesMock.mockRejectedValueOnce(new Error("allocation failed"));

    const { result } = renderHook(() =>
      useStaffProjectCreatePanel({
        modules,
        modulesError: null,
      }),
    );

    await waitFor(() => expect(result.current.allocationTemplatesError).toBe("allocation failed"));
    expect(result.current.isLoadingAllocationTemplates).toBe(false);
  });

  it("validates and submits create-project flows for error and success branches", async () => {
    const { result } = renderHook(() =>
      useStaffProjectCreatePanel({
        modules,
        modulesError: null,
      }),
    );

    await waitFor(() => expect(result.current.moduleId).toBe("5"));
    await waitFor(() => expect(result.current.isLoadingTemplates).toBe(false));

    await act(async () => {
      await result.current.onSubmit({ preventDefault: vi.fn() } as any);
    });
    expect(submitCreateProjectMock).not.toHaveBeenCalled();

    act(() => {
      result.current.setProjectName("  Release Project  ");
      result.current.setTemplateId("11");
    });

    submitCreateProjectMock.mockResolvedValueOnce({ ok: false, error: "submit failed" } as any);
    await act(async () => {
      await result.current.onSubmit({ preventDefault: vi.fn() } as any);
    });
    expect(result.current.submitError).toBe("submit failed");

    submitCreateProjectMock.mockResolvedValueOnce({
      ok: true,
      createdName: "Release Project",
      createdProjectId: 90,
      createdModuleId: 5,
      hasAllocationTemplate: true,
    } as any);
    await act(async () => {
      await result.current.onSubmit({ preventDefault: vi.fn() } as any);
    });
    expect(pushMock).toHaveBeenCalledWith("/staff/projects/90/team-allocation");

    act(() => {
      result.current.setProjectName("Second");
      result.current.setTemplateId("11");
    });
    submitCreateProjectMock.mockResolvedValueOnce({
      ok: true,
      createdName: "Second",
      createdProjectId: 91,
      createdModuleId: 5,
      hasAllocationTemplate: false,
    } as any);
    await act(async () => {
      await result.current.onSubmit({ preventDefault: vi.fn() } as any);
    });
    expect(pushMock).toHaveBeenLastCalledWith("/staff/modules/5");
    expect(refreshMock).toHaveBeenCalled();
  });
});
