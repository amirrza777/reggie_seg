import { describe, expect, it, vi } from "vitest";
import {
  applyManualAllocationHandler,
  getManualAllocationWorkspaceHandler,
} from "./controller.manual.js";

function createResponse() {
  const res = { status: vi.fn(), json: vi.fn() } as any;
  res.status.mockReturnValue(res);
  return res;
}

describe("controller.manual", () => {
  it("returns 401 when workspace auth is missing", async () => {
    const res = createResponse();
    await getManualAllocationWorkspaceHandler({ params: { projectId: "7" }, query: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 when search query shape is invalid", async () => {
    const req = { user: { sub: 4 }, params: { projectId: "7" }, query: { q: { raw: "x" } } };
    const res = createResponse();
    await getManualAllocationWorkspaceHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "q must be a string with up to 120 characters" });
  });

  it("returns 400 when manual studentIds payload is not numeric", async () => {
    const req = { user: { sub: 4 }, params: { projectId: "7" }, body: { teamName: "Gamma", studentIds: [1, "x"] } };
    const res = createResponse();
    await applyManualAllocationHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "studentIds must be an array of numbers" });
  });
});