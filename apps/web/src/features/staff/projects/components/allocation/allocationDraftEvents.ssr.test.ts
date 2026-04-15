// @vitest-environment node
import { describe, expect, it } from "vitest";
import { emitStaffAllocationDraftsRefresh } from "./allocationDraftEvents";

describe("allocationDraftEvents (SSR)", () => {
  it("does not throw when window is unavailable", () => {
    expect(() => emitStaffAllocationDraftsRefresh()).not.toThrow();
  });
});
