import { describe, expect, it } from "vitest";
import {
  approveAllocationDraftForProject,
  deleteAllocationDraftForProject,
  updateAllocationDraftForProject,
} from "./service.drafts.js";

describe("service.drafts", () => {
  it("rejects invalid draft team id for update", async () => {
    await expect(updateAllocationDraftForProject(1, 2, 0, { teamName: "A" })).rejects.toMatchObject({
      code: "INVALID_DRAFT_TEAM_ID",
    });
  });

  it("rejects empty update payload", async () => {
    await expect(updateAllocationDraftForProject(1, 2, 3, {})).rejects.toMatchObject({
      code: "INVALID_DRAFT_UPDATE",
    });
  });

  it("rejects invalid expectedUpdatedAt in approve and delete", async () => {
    await expect(approveAllocationDraftForProject(1, 2, 3, { expectedUpdatedAt: "bad" })).rejects.toMatchObject({
      code: "INVALID_EXPECTED_UPDATED_AT",
    });
    await expect(deleteAllocationDraftForProject(1, 2, 3, { expectedUpdatedAt: "bad" })).rejects.toMatchObject({
      code: "INVALID_EXPECTED_UPDATED_AT",
    });
  });
});