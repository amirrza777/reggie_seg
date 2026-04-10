import { describe, expect, it, vi } from "vitest";
import {
  approveAllocationDraftHandler,
  deleteAllocationDraftHandler,
  listAllocationDraftsHandler,
  updateAllocationDraftHandler,
} from "./controller.drafts.js";

function createResponse() {
  const res = { status: vi.fn(), json: vi.fn() } as any;
  res.status.mockReturnValue(res);
  return res;
}

describe("controller.drafts", () => {
  it("returns 401 when listing drafts without auth", async () => {
    const res = createResponse();
    await listAllocationDraftsHandler({ params: { projectId: "4" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 for invalid draft team id during update", async () => {
    const req = { user: { sub: 3 }, params: { projectId: "4", teamId: "x" }, body: { teamName: "New" } };
    const res = createResponse();
    await updateAllocationDraftHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid draft team ID" });
  });

  it("returns 400 when approve expectedUpdatedAt is not a string", async () => {
    const req = { user: { sub: 3 }, params: { projectId: "4", teamId: "9" }, body: { expectedUpdatedAt: 12 } };
    const res = createResponse();
    await approveAllocationDraftHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when deleting draft with invalid project id", async () => {
    const req = { user: { sub: 3 }, params: { projectId: "nope", teamId: "9" }, body: {} };
    const res = createResponse();
    await deleteAllocationDraftHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid project ID" });
  });
});