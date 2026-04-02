import { renderHook, act } from "@testing-library/react";
import { useParticipantSelection } from "./useParticipantSelection";

describe("useParticipantSelection", () => {
  it("initialises with the given selected ids and invite all flag", () => {
    const { result } = renderHook(() =>
      useParticipantSelection({ initialSelectedIds: [1, 2], initialInviteAll: true })
    );
    expect(result.current.inviteAll).toBe(true);
    expect(result.current.selectedIds).toEqual(new Set([1, 2]));
  });

  it("initialises with empty selection when no ids provided", () => {
    const { result } = renderHook(() =>
      useParticipantSelection({ initialSelectedIds: [], initialInviteAll: false })
    );
    expect(result.current.inviteAll).toBe(false);
    expect(result.current.selectedIds).toEqual(new Set());
  });

  it("toggles a participant into the selection", () => {
    const { result } = renderHook(() =>
      useParticipantSelection({ initialSelectedIds: [1], initialInviteAll: false })
    );

    act(() => {
      result.current.toggleParticipant(2);
    });

    expect(result.current.selectedIds).toEqual(new Set([1, 2]));
  });

  it("toggles a participant out of the selection", () => {
    const { result } = renderHook(() =>
      useParticipantSelection({ initialSelectedIds: [1, 2], initialInviteAll: false })
    );

    act(() => {
      result.current.toggleParticipant(1);
    });

    expect(result.current.selectedIds).toEqual(new Set([2]));
  });

  it("updates invite all via setInviteAll", () => {
    const { result } = renderHook(() =>
      useParticipantSelection({ initialSelectedIds: [], initialInviteAll: true })
    );

    act(() => {
      result.current.setInviteAll(false);
    });

    expect(result.current.inviteAll).toBe(false);
  });

  it("replaces all selected ids via selectAll", () => {
    const { result } = renderHook(() =>
      useParticipantSelection({ initialSelectedIds: [1], initialInviteAll: true })
    );

    act(() => {
      result.current.selectAll([3, 4, 5]);
    });

    expect(result.current.selectedIds).toEqual(new Set([3, 4, 5]));
  });

  it("handles toggling the same participant twice", () => {
    const { result } = renderHook(() =>
      useParticipantSelection({ initialSelectedIds: [1], initialInviteAll: false })
    );

    act(() => {
      result.current.toggleParticipant(1);
    });
    expect(result.current.selectedIds).toEqual(new Set());

    act(() => {
      result.current.toggleParticipant(1);
    });
    expect(result.current.selectedIds).toEqual(new Set([1]));
  });
});
