import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCustomisedAllocation } from "./useCustomisedAllocation.impl";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./allocationDraftEvents", () => ({ emitStaffAllocationDraftsRefresh: vi.fn() }));
vi.mock("@/features/projects/api/teamAllocation", () => ({
  applyCustomAllocation: vi.fn(),
  getCustomAllocationCoverage: vi.fn().mockResolvedValue({}),
  getCustomAllocationQuestionnaires: vi.fn().mockResolvedValue({ questionnaires: [] }),
  previewCustomAllocation: vi.fn(),
}));

describe("useCustomisedAllocation.impl", () => {
  it("initialises teamCountInput from initialTeamCount", async () => {
    const { result } = renderHook(() =>
      useCustomisedAllocation({ projectId: 9, initialTeamCount: 4 }),
    );
    expect(result.current.teamCountInput).toBe("4");
    await waitFor(() => expect(result.current.isLoadingQuestionnaires).toBe(false));
  });

  it("clamps initialTeamCount to at least 1 for negative values", () => {
    const { result } = renderHook(() =>
      useCustomisedAllocation({ projectId: 9, initialTeamCount: -1 }),
    );
    expect(result.current.teamCountInput).toBe("1");
  });

  it("updates teamCountInput and clears successMessage via onTeamCountInputChange", async () => {
    const { result } = renderHook(() =>
      useCustomisedAllocation({ projectId: 9, initialTeamCount: 2 }),
    );
    await waitFor(() => expect(result.current.isLoadingQuestionnaires).toBe(false));
    act(() => result.current.onTeamCountInputChange("5"));
    expect(result.current.teamCountInput).toBe("5");
    expect(result.current.successMessage).toBe("");
  });
});