import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  toRandomPreviewFullName,
  useStaffRandomAllocationPreview,
} from "./useStaffRandomAllocationPreview";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./allocationDraftEvents", () => ({ emitStaffAllocationDraftsRefresh: vi.fn() }));
vi.mock("@/features/projects/api/teamAllocation", () => ({
  applyRandomAllocation: vi.fn(),
  getRandomAllocationPreview: vi.fn(),
}));

describe("toRandomPreviewFullName", () => {
  it("returns the trimmed full name when both names are present", () => {
    expect(toRandomPreviewFullName({ firstName: "Jin", lastName: "Lee", email: "jin@example.com" })).toBe("Jin Lee");
  });

  it("falls back to email when both names are empty", () => {
    expect(toRandomPreviewFullName({ firstName: "", lastName: "", email: "x@example.com" })).toBe("x@example.com");
  });

  it("falls back to email when both names are whitespace", () => {
    expect(toRandomPreviewFullName({ firstName: " ", lastName: " ", email: "y@example.com" })).toBe("y@example.com");
  });
});

describe("useStaffRandomAllocationPreview", () => {
  it("initializes teamCountInput from initialTeamCount", () => {
    const { result } = renderHook(() =>
      useStaffRandomAllocationPreview({ projectId: 4, initialTeamCount: 5 }),
    );
    expect(result.current.teamCountInput).toBe("5");
  });

  it("clamps initialTeamCount to at least 1", () => {
    const { result } = renderHook(() =>
      useStaffRandomAllocationPreview({ projectId: 4, initialTeamCount: 0 }),
    );
    expect(result.current.teamCountInput).toBe("2");
  });

  it("updates teamCountInput via onTeamCountChange", () => {
    const { result } = renderHook(() =>
      useStaffRandomAllocationPreview({ projectId: 4, initialTeamCount: 2 }),
    );
    act(() => result.current.onTeamCountChange("7"));
    expect(result.current.teamCountInput).toBe("7");
  });

  it("getTeamName returns overridden name if present, otherwise fallback", () => {
    const { result } = renderHook(() =>
      useStaffRandomAllocationPreview({ projectId: 4, initialTeamCount: 2 }),
    );
    expect(result.current.getTeamName(0, "Suggested")).toBe("Suggested");
    act(() => result.current.onTeamNameChange(0, "Orion"));
    expect(result.current.getTeamName(0, "Suggested")).toBe("Orion");
  });
});