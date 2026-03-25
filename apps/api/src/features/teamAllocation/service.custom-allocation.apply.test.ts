import { describe, expect, it } from "vitest";
import { applyCustomAllocationForProject } from "./service.custom-allocation.apply.js";

describe("service.custom-allocation.apply", () => {
  it("rejects empty preview id", async () => {
    await expect(applyCustomAllocationForProject(1, 2, { previewId: "   " })).rejects.toMatchObject({
      code: "INVALID_PREVIEW_ID",
    });
  });

  it("rejects malformed team names payload", async () => {
    await expect(
      applyCustomAllocationForProject(1, 2, { previewId: "preview-1", teamNames: ["A", 12 as any] }),
    ).rejects.toMatchObject({ code: "INVALID_TEAM_NAMES" });
  });
});