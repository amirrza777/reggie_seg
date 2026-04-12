import { describe, expect, it, vi } from "vitest";
import { STAFF_ALLOCATION_DRAFTS_REFRESH_EVENT, emitStaffAllocationDraftsRefresh } from "./allocationDraftEvents";

describe("allocationDraftEvents", () => {
  it("uses a stable refresh event name", () => {
    expect(STAFF_ALLOCATION_DRAFTS_REFRESH_EVENT).toBe("staff-allocation-drafts:refresh");
  });

  it("dispatches the refresh event on window", () => {
    const spy = vi.spyOn(window, "dispatchEvent");
    emitStaffAllocationDraftsRefresh();
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: STAFF_ALLOCATION_DRAFTS_REFRESH_EVENT }));
    spy.mockRestore();
  });
});