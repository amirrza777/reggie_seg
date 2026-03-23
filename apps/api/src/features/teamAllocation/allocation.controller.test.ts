import { describe, expect, it, vi } from "vitest";
import {
  applyManualAllocationHandler,
  getManualAllocationWorkspaceHandler,
  previewRandomAllocationHandler,
} from "./allocation.controller.js";

function createResponse() {
  const res = { status: vi.fn(), json: vi.fn() } as any;
  res.status.mockReturnValue(res);
  return res;
}

describe("allocation.controller", () => {
  it("returns 400 when preview teamCount is invalid", async () => {
    const res = createResponse();
    await previewRandomAllocationHandler({ user: { sub: 5 }, params: { projectId: "9" }, query: { teamCount: "0" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "teamCount must be a positive integer" });
  });

  it("returns 401 for manual workspace when auth is missing", async () => {
    const res = createResponse();
    await getManualAllocationWorkspaceHandler({ params: { projectId: "9" }, query: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("returns 400 when manual allocation studentIds are malformed", async () => {
    const req = { user: { sub: 7 }, params: { projectId: "22" }, body: { teamName: "Team A", studentIds: ["x"] } };
    const res = createResponse();
    await applyManualAllocationHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "studentIds must be an array of numbers" });
  });
});