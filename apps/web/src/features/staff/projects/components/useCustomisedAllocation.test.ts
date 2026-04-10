import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCustomisedAllocation } from "./useCustomisedAllocation";
import {
  getCustomAllocationCoverage,
  getCustomAllocationQuestionnaires,
  previewCustomAllocation,
} from "@/features/projects/api/teamAllocation";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("./allocationDraftEvents", () => ({ emitStaffAllocationDraftsRefresh: vi.fn() }));
vi.mock("@/features/projects/api/teamAllocation", () => ({
  applyCustomAllocation: vi.fn(),
  getCustomAllocationCoverage: vi.fn(),
  getCustomAllocationQuestionnaires: vi.fn(),
  previewCustomAllocation: vi.fn(),
}));

const getQuestionnairesMock = vi.mocked(getCustomAllocationQuestionnaires);
const getCoverageMock = vi.mocked(getCustomAllocationCoverage);
const previewMock = vi.mocked(previewCustomAllocation);

const questionnaires = {
  project: { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" },
  questionnaires: [
    { id: 102, templateName: "Zeta", ownerId: 1, isPublic: false, eligibleQuestionCount: 1, eligibleQuestions: [{ id: 2, label: "Timezone", type: "multiple-choice" }] },
    { id: 101, templateName: "Alpha", ownerId: 1, isPublic: true, eligibleQuestionCount: 1, eligibleQuestions: [{ id: 1, label: "Work style", type: "rating" }] },
  ],
};

async function selectTemplate(result: ReturnType<typeof renderHook<typeof useCustomisedAllocation>>["result"]) {
  act(() => result.current.onSelectTemplate("101"));
  await waitFor(() => {
    expect(getCoverageMock).toHaveBeenCalledWith(9, 101);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getQuestionnairesMock.mockResolvedValue(questionnaires as never);
  getCoverageMock.mockResolvedValue({
    project: questionnaires.project,
    questionnaireTemplateId: 101,
    totalAvailableStudents: 4,
    respondingStudents: 3,
    nonRespondingStudents: 1,
    responseRate: 75,
    responseThreshold: 80,
  } as never);
});

describe("useCustomisedAllocation", () => {
  it("loads and sorts eligible templates", async () => {
    const { result } = renderHook(() => useCustomisedAllocation({ projectId: 9, initialTeamCount: 2 }));
    await waitFor(() => expect(result.current.isLoadingQuestionnaires).toBe(false));
    expect(getQuestionnairesMock).toHaveBeenCalledWith(9);
    expect(result.current.eligibleQuestionnaires.map((item) => item.templateName)).toEqual(["Alpha", "Zeta"]);
  });

  it("keeps selected questionnaire visible when search filters others", async () => {
    const { result } = renderHook(() => useCustomisedAllocation({ projectId: 9, initialTeamCount: 2 }));
    await waitFor(() => expect(result.current.eligibleQuestionnaires.length).toBe(2));
    await selectTemplate(result);
    act(() => result.current.setQuestionnaireSearch("nomatch"));
    expect(result.current.visibleQuestionnaires.map((item) => item.id)).toEqual([101]);
  });

  it("updates strategy and weight for active criteria", async () => {
    const { result } = renderHook(() => useCustomisedAllocation({ projectId: 9, initialTeamCount: 2 }));
    await waitFor(() => expect(result.current.eligibleQuestionnaires.length).toBe(2));
    await selectTemplate(result);
    act(() => result.current.updateStrategy(1, "ignore"));
    act(() => result.current.updateWeight(1, 5));
    expect(result.current.criteriaConfigByQuestionId[1]).toEqual({ strategy: "ignore", weight: 5 });
    expect(result.current.successMessage).toBe("");
  });

  it("calls preview API with current criteria", async () => {
    previewMock.mockResolvedValue({ previewId: "pv-1", previewTeams: [], unassignedStudents: [] } as never);
    const { result } = renderHook(() => useCustomisedAllocation({ projectId: 9, initialTeamCount: 2 }));
    await waitFor(() => expect(result.current.eligibleQuestionnaires.length).toBe(2));
    await selectTemplate(result);
    act(() => result.current.runPreview());
    await waitFor(() => expect(previewMock).toHaveBeenCalledWith(9, expect.objectContaining({ questionnaireTemplateId: 101, teamCount: 2 })));
    await waitFor(() => expect(result.current.preview?.previewId).toBe("pv-1"));
  });

  it("clears preview state and sets fallback message when preview fails", async () => {
    previewMock.mockResolvedValueOnce({ previewId: "pv-1", previewTeams: [], unassignedStudents: [] } as never);
    previewMock.mockRejectedValueOnce("bad");
    const { result } = renderHook(() => useCustomisedAllocation({ projectId: 9, initialTeamCount: 2 }));
    await waitFor(() => expect(result.current.eligibleQuestionnaires.length).toBe(2));
    await selectTemplate(result);
    act(() => result.current.runPreview());
    await waitFor(() => expect(result.current.preview?.previewId).toBe("pv-1"));
    act(() => result.current.runPreview());
    await waitFor(() => expect(result.current.errorMessage).toBe("Failed to preview customised allocation."));
    expect(result.current.preview).toBeNull();
  });
});