import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCustomisedAllocationLoading } from "./useCustomisedAllocationLoading";
import {
  getCustomAllocationCoverage,
  getCustomAllocationQuestionnaires,
} from "@/features/projects/api/teamAllocation";

vi.mock("@/features/projects/api/teamAllocation", () => ({
  getCustomAllocationCoverage: vi.fn(),
  getCustomAllocationQuestionnaires: vi.fn(),
}));

const getQuestionnairesMock = vi.mocked(getCustomAllocationQuestionnaires);
const getCoverageMock = vi.mocked(getCustomAllocationCoverage);

const eligible = {
  id: 101,
  templateName: "Alpha",
  ownerId: 1,
  isPublic: true,
  eligibleQuestionCount: 1,
  eligibleQuestions: [{ id: 1, label: "Work style", type: "multiple-choice" }],
};
const ineligible = {
  id: 202,
  templateName: "Beta",
  ownerId: 1,
  isPublic: false,
  eligibleQuestionCount: 0,
  eligibleQuestions: [],
};

describe("useCustomisedAllocationLoading", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches questionnaires on mount and sets loading states", async () => {
    getQuestionnairesMock.mockResolvedValue({ questionnaires: [eligible] } as any);
    const { result } = renderHook(() =>
      useCustomisedAllocationLoading({ projectId: 9, selectedTemplateId: "" }),
    );
    expect(result.current.isLoadingQuestionnaires).toBe(true);
    await waitFor(() => expect(result.current.isLoadingQuestionnaires).toBe(false));
    expect(getQuestionnairesMock).toHaveBeenCalledWith(9);
  });

  it("filters out questionnaires with no eligible questions", async () => {
    getQuestionnairesMock.mockResolvedValue({ questionnaires: [eligible, ineligible] } as any);
    const { result } = renderHook(() =>
      useCustomisedAllocationLoading({ projectId: 9, selectedTemplateId: "" }),
    );
    await waitFor(() => expect(result.current.isLoadingQuestionnaires).toBe(false));
    expect(result.current.eligibleQuestionnaires).toHaveLength(1);
    expect(result.current.eligibleQuestionnaires[0].id).toBe(101);
  });

  it("sets loadError when questionnaire fetch fails", async () => {
    getQuestionnairesMock.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() =>
      useCustomisedAllocationLoading({ projectId: 9, selectedTemplateId: "" }),
    );
    await waitFor(() => expect(result.current.loadError).toBe("Network error"));
    expect(result.current.isLoadingQuestionnaires).toBe(false);
  });

  it("sets fallback loadError for non-Error rejections", async () => {
    getQuestionnairesMock.mockRejectedValue("oops");
    const { result } = renderHook(() =>
      useCustomisedAllocationLoading({ projectId: 9, selectedTemplateId: "" }),
    );
    await waitFor(() => expect(result.current.loadError).toBe("Failed to load questionnaires."));
  });

  it("returns selectedQuestionnaire when templateId matches an eligible questionnaire", async () => {
    getQuestionnairesMock.mockResolvedValue({ questionnaires: [eligible] } as any);
    getCoverageMock.mockResolvedValue({} as any);
    const { result } = renderHook(() =>
      useCustomisedAllocationLoading({ projectId: 9, selectedTemplateId: "101" }),
    );
    await waitFor(() => expect(result.current.isLoadingQuestionnaires).toBe(false));
    expect(result.current.selectedQuestionnaire?.id).toBe(101);
  });

  it("returns null selectedQuestionnaire for unknown templateId", async () => {
    getQuestionnairesMock.mockResolvedValue({ questionnaires: [eligible] } as any);
    const { result } = renderHook(() =>
      useCustomisedAllocationLoading({ projectId: 9, selectedTemplateId: "999" }),
    );
    await waitFor(() => expect(result.current.isLoadingQuestionnaires).toBe(false));
    expect(result.current.selectedQuestionnaire).toBeNull();
  });

  it("fetches coverage when a valid templateId is provided", async () => {
    getQuestionnairesMock.mockResolvedValue({ questionnaires: [eligible] } as any);
    const coverageData = {
      totalAvailableStudents: 4,
      respondingStudents: 3,
      nonRespondingStudents: 1,
      responseRate: 75,
      responseThreshold: 80,
    };
    getCoverageMock.mockResolvedValue(coverageData as any);
    const { result } = renderHook(() =>
      useCustomisedAllocationLoading({ projectId: 9, selectedTemplateId: "101" }),
    );
    await waitFor(() => expect(result.current.coverage).not.toBeNull());
    expect(getCoverageMock).toHaveBeenCalledWith(9, 101);
    expect(result.current.coverage).toMatchObject({ responseRate: 75 });
  });

  it("clears coverage and sets coverageError when coverage fetch fails", async () => {
    getQuestionnairesMock.mockResolvedValue({ questionnaires: [eligible] } as any);
    getCoverageMock.mockRejectedValue(new Error("Coverage failed"));
    const { result } = renderHook(() =>
      useCustomisedAllocationLoading({ projectId: 9, selectedTemplateId: "101" }),
    );
    await waitFor(() => expect(result.current.coverageError).toBe("Coverage failed"));
    expect(result.current.coverage).toBeNull();
  });

  it("clears coverage when selectedTemplateId is reset to empty", async () => {
    getQuestionnairesMock.mockResolvedValue({ questionnaires: [eligible] } as any);
    getCoverageMock.mockResolvedValue({ responseRate: 80 } as any);
    const { result, rerender } = renderHook(
      ({ templateId }: { templateId: string }) =>
        useCustomisedAllocationLoading({ projectId: 9, selectedTemplateId: templateId }),
      { initialProps: { templateId: "101" } },
    );
    await waitFor(() => expect(result.current.coverage).not.toBeNull());
    act(() => { rerender({ templateId: "" }); });
    await waitFor(() => expect(result.current.coverage).toBeNull());
    expect(result.current.coverageError).toBe("");
  });
});