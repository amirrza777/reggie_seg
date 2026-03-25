import { describe, expect, it, vi } from "vitest";
import {
  applyRandomAllocationHandler,
  previewRandomAllocationHandler,
} from "./controller.random.js";

function createResponse() {
  const res = { status: vi.fn(), json: vi.fn() } as any;
  res.status.mockReturnValue(res);
  return res;
}

describe("controller.random", () => {
  it("returns 400 for preview when minTeamSize is greater than maxTeamSize", async () => {
    const req = { user: { sub: 8 }, params: { projectId: "2" }, query: { teamCount: "2", minTeamSize: "4", maxTeamSize: "3" } };
    const res = createResponse();
    await previewRandomAllocationHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "minTeamSize cannot be greater than maxTeamSize" });
  });

  it("returns 400 when preview teamCount is missing", async () => {
    const res = createResponse();
    await previewRandomAllocationHandler({ user: { sub: 8 }, params: { projectId: "2" }, query: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when apply receives invalid teamNames payload", async () => {
    const req = { user: { sub: 8 }, params: { projectId: "2" }, body: { teamCount: 2, teamNames: 123 } };
    const res = createResponse();
    await applyRandomAllocationHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "teamNames must be an array of strings when provided" });
  });
});