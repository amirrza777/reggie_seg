import { describe, expect, it } from "vitest";
import {
  approveAllocationDraftForProject,
  deleteAllocationDraftForProject,
  updateAllocationDraftForProject,
} from "./service.js";

describe("service allocation drafts", () => {
  it("rejects invalid draft team id", async () => {
    await expect(updateAllocationDraftForProject(1, 2, 0, { teamName: "T" })).rejects.toEqual({
      code: "INVALID_DRAFT_TEAM_ID",
    });
    await expect(approveAllocationDraftForProject(1, 2, 0)).rejects.toEqual({ code: "INVALID_DRAFT_TEAM_ID" });
    await expect(deleteAllocationDraftForProject(1, 2, 0)).rejects.toEqual({ code: "INVALID_DRAFT_TEAM_ID" });
  });

  it("rejects empty update payload", async () => {
    await expect(updateAllocationDraftForProject(1, 2, 3, {})).rejects.toEqual({
      code: "INVALID_DRAFT_UPDATE",
    });
  });

  it("rejects malformed expectedUpdatedAt", async () => {
    await expect(
      approveAllocationDraftForProject(1, 2, 3, { expectedUpdatedAt: "not-a-date" }),
    ).rejects.toEqual({ code: "INVALID_EXPECTED_UPDATED_AT" });
  });
});