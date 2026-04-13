import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCustomisedAllocation } from "./useCustomisedAllocation";
import {
  applyCustomAllocation,
  getCustomAllocationCoverage,
  getCustomAllocationQuestionnaires,
  previewCustomAllocation,
} from "@/features/projects/api/teamAllocation";
import { emitStaffAllocationDraftsRefresh } from "../allocationDraftEvents";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("../allocationDraftEvents", () => ({ emitStaffAllocationDraftsRefresh: vi.fn() }));
vi.mock("@/features/projects/api/teamAllocation", () => ({
  applyCustomAllocation: vi.fn(),
  getCustomAllocationCoverage: vi.fn(),
  getCustomAllocationQuestionnaires: vi.fn(),
  previewCustomAllocation: vi.fn(),
}));

const getQuestionnairesMock = vi.mocked(getCustomAllocationQuestionnaires);
const getCoverageMock = vi.mocked(getCustomAllocationCoverage);
const previewMock = vi.mocked(previewCustomAllocation);
const applyMock = vi.mocked(applyCustomAllocation);
const emitDraftRefreshMock = vi.mocked(emitStaffAllocationDraftsRefresh);

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

  it("keeps selected template visible when filtered out and updates criterion strategy/weight", async () => {
    const { result } = renderHook(() => useCustomisedAllocation({ projectId: 9, initialTeamCount: 2 }));
    await waitFor(() => expect(result.current.eligibleQuestionnaires.length).toBe(2));

    act(() => result.current.onSelectTemplate("101"));
    await waitFor(() => expect(result.current.selectedQuestionnaire?.id).toBe(101));

    act(() => result.current.setQuestionnaireSearch("zeta"));
    expect(result.current.visibleQuestionnaires.map((item) => item.id)).toEqual([101, 102]);

    act(() => result.current.updateStrategy(1, "ignore"));
    expect(result.current.criteriaConfigByQuestionId[1]?.strategy).toBe("ignore");
    expect(result.current.activeCriteriaCount).toBe(0);

    act(() => result.current.updateWeight(1, 4));
    expect(result.current.criteriaConfigByQuestionId[1]?.weight).toBe(4);
  });

  it("validates preview/apply flow and handles stale-preview apply failures", async () => {
    previewMock.mockResolvedValue({
      previewId: "pv-2",
      previewTeams: [
        { index: 0, suggestedName: "Team A", members: [] },
        { index: 1, suggestedName: "Team B", members: [] },
      ],
      unassignedStudents: [],
    } as any);
    applyMock.mockRejectedValueOnce(new Error("Preview no longer exists for this project"));

    const { result } = renderHook(() => useCustomisedAllocation({ projectId: 9, initialTeamCount: 2 }));
    await waitFor(() => expect(result.current.eligibleQuestionnaires.length).toBe(2));

    act(() => result.current.runApplyAllocation());
    expect(result.current.errorMessage).toBe("Generate a preview before applying.");

    act(() => result.current.runPreview());
    expect(result.current.errorMessage).toBe("Select a questionnaire first.");

    act(() => result.current.onSelectTemplate("101"));
    await waitFor(() => expect(result.current.selectedQuestionnaire?.id).toBe(101));

    act(() => result.current.runPreview());
    await waitFor(() => expect(result.current.preview?.previewId).toBe("pv-2"));

    act(() => result.current.onTeamCountInputChange("3"));
    act(() => result.current.runApplyAllocation());
    expect(result.current.errorMessage).toBe("Preview is out of date. Generate a fresh preview before applying.");

    act(() => result.current.onTeamCountInputChange("2"));
    act(() => result.current.runApplyAllocation());
    expect(result.current.errorMessage).toBe("Please confirm that this allocation should proceed.");

    act(() => result.current.onToggleTeamRename(0, "Team A", false));
    act(() => result.current.onTeamNameChange(0, "  Team A  "));
    act(() => result.current.onToggleTeamRename(0, "Team A", true));
    act(() => result.current.onTeamNameChange(1, "Team A"));
    act(() => result.current.toggleConfirmAllocation());
    expect(result.current.errorMessage).toBe("Team names must be unique.");

    act(() => result.current.onTeamNameChange(1, "Team B"));
    act(() => result.current.toggleConfirmAllocation());
    expect(result.current.confirmApply).toBe(true);

    act(() => result.current.runApplyAllocation());
    await waitFor(() => expect(applyMock).toHaveBeenCalledWith(9, { previewId: "pv-2", teamNames: ["Team A", "Team B"] }));
    await waitFor(() => expect(result.current.errorMessage).toContain("Preview no longer exists"));
    expect(result.current.preview).toBeNull();
    expect(result.current.confirmApply).toBe(false);
  });

  it("handles preview fallback errors and applies allocation successfully", async () => {
    previewMock
      .mockRejectedValueOnce("non-error")
      .mockResolvedValueOnce({
        previewId: "pv-3",
        previewTeams: [
          { index: 0, suggestedName: "Team A", members: [] },
          { index: 1, suggestedName: "Team B", members: [] },
        ],
        unassignedStudents: [],
      } as any);
    applyMock.mockResolvedValueOnce({ appliedTeams: [{ id: 1 }, { id: 2 }] } as any);

    const { result } = renderHook(() => useCustomisedAllocation({ projectId: 9, initialTeamCount: 2 }));
    await waitFor(() => expect(result.current.eligibleQuestionnaires.length).toBe(2));
    act(() => result.current.onSelectTemplate("101"));
    await waitFor(() => expect(result.current.selectedQuestionnaire?.id).toBe(101));

    act(() => result.current.runPreview());
    await waitFor(() => expect(result.current.errorMessage).toBe("Failed to preview customised allocation."));
    expect(result.current.preview).toBeNull();

    act(() => result.current.runPreview());
    await waitFor(() => expect(result.current.preview?.previewId).toBe("pv-3"));

    act(() => result.current.toggleConfirmAllocation());
    act(() => result.current.runApplyAllocation());

    await waitFor(() => expect(applyMock).toHaveBeenCalledWith(9, { previewId: "pv-3", teamNames: ["Team A", "Team B"] }));
    await waitFor(() => expect(result.current.successMessage).toBe("Saved customised allocation as draft across 2 teams."));
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(emitDraftRefreshMock).toHaveBeenCalledTimes(1);
  });

  it("supports non-respondent and min/max input handlers with initial team-count fallback", async () => {
    previewMock.mockResolvedValueOnce({
      previewId: "pv-inputs",
      previewTeams: [{ index: 0, suggestedName: "Team A", members: [] }],
      unassignedStudents: [],
    } as any);

    const { result } = renderHook(() => useCustomisedAllocation({ projectId: 9, initialTeamCount: 0 }));
    await waitFor(() => expect(result.current.eligibleQuestionnaires.length).toBe(2));

    expect(result.current.teamCountInput).toBe("2");
    act(() => result.current.onNonRespondentStrategyChange("exclude"));
    act(() => result.current.onMinTeamSizeInputChange("1"));
    act(() => result.current.onMaxTeamSizeInputChange("3"));
    expect(result.current.nonRespondentStrategy).toBe("exclude");
    expect(result.current.minTeamSizeInput).toBe("1");
    expect(result.current.maxTeamSizeInput).toBe("3");

    act(() => result.current.onSelectTemplate("101"));
    await waitFor(() => expect(result.current.selectedQuestionnaire?.id).toBe(101));
    act(() => result.current.runPreview());

    await waitFor(() =>
      expect(previewMock).toHaveBeenCalledWith(
        9,
        expect.objectContaining({
          questionnaireTemplateId: 101,
          teamCount: 2,
          minTeamSize: 1,
          maxTeamSize: 3,
          nonRespondentStrategy: "exclude",
        }),
      ),
    );
  });

  it("handles preview error instances, apply fallback errors, and singular apply success messaging", async () => {
    previewMock
      .mockRejectedValueOnce(new Error("preview exploded"))
      .mockResolvedValueOnce({
        previewId: "pv-4",
        previewTeams: [
          { index: 0, suggestedName: "Team A", members: [] },
          { index: 1, suggestedName: "Team B", members: [] },
        ],
        unassignedStudents: [],
      } as any);
    applyMock
      .mockRejectedValueOnce("non-error-apply")
      .mockResolvedValueOnce({ appliedTeams: [{ id: 1 }] } as any);

    const { result } = renderHook(() => useCustomisedAllocation({ projectId: 9, initialTeamCount: 2 }));
    await waitFor(() => expect(result.current.eligibleQuestionnaires.length).toBe(2));
    act(() => result.current.onSelectTemplate("101"));
    await waitFor(() => expect(result.current.selectedQuestionnaire?.id).toBe(101));

    act(() => result.current.runPreview());
    await waitFor(() => expect(result.current.errorMessage).toBe("preview exploded"));

    act(() => result.current.runPreview());
    await waitFor(() => expect(result.current.preview?.previewId).toBe("pv-4"));

    act(() => result.current.onToggleTeamRename(1, "Team B", true));
    expect(result.current.teamNames[1]).toBe("Team B");

    act(() => result.current.toggleConfirmAllocation());
    expect(result.current.confirmApply).toBe(true);
    act(() => result.current.toggleConfirmAllocation());
    expect(result.current.confirmApply).toBe(false);
    act(() => result.current.toggleConfirmAllocation());
    expect(result.current.confirmApply).toBe(true);

    act(() => result.current.onTeamNameChange(1, "Team A"));
    act(() => result.current.runApplyAllocation());
    expect(result.current.errorMessage).toBe("Team names must be unique.");

    act(() => result.current.onTeamNameChange(1, "Team B"));
    act(() => result.current.runApplyAllocation());
    await waitFor(() => expect(result.current.errorMessage).toBe("Failed to apply customised allocation."));

    act(() => result.current.runApplyAllocation());
    await waitFor(() => expect(result.current.successMessage).toBe("Saved customised allocation as draft across 1 team."));
  });
});
