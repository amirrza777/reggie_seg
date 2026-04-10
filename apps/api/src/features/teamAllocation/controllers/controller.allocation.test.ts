import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "../service/service.js";
import { applyManualAllocationHandler, getManualAllocationWorkspaceHandler } from "./controller.manual.js";
import { applyRandomAllocationHandler, previewRandomAllocationHandler } from "./controller.random.js";

vi.mock("./service.js", () => ({
  applyManualAllocationForProject: vi.fn(),
  applyRandomAllocationForProject: vi.fn(),
  getManualAllocationWorkspaceForProject: vi.fn(),
  previewRandomAllocationForProject: vi.fn(),
}));

function createResponse() {
  const res: Partial<Response> = { status: vi.fn(), json: vi.fn() };
  (res.status as any).mockReturnValue(res);
  (res.json as any).mockReturnValue(res);
  return res as Response;
}

describe("controller allocation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 on preview when auth is missing", async () => {
    const res = createResponse();
    await previewRandomAllocationHandler({ user: undefined, params: { projectId: "1" }, query: { teamCount: "2" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns random preview payload", async () => {
    (service.previewRandomAllocationForProject as any).mockResolvedValue({ teamCount: 2, previewTeams: [] });
    const req: any = { user: { sub: 2 }, params: { projectId: "3" }, query: { teamCount: "2", minTeamSize: "1" } };
    const res = createResponse();
    await previewRandomAllocationHandler(req, res);
    expect(service.previewRandomAllocationForProject).toHaveBeenCalledWith(2, 3, 2, { minTeamSize: 1 });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ teamCount: 2 }));
  });

  it("returns 400 for invalid manual allocation payload", async () => {
    const res = createResponse();
    await applyManualAllocationHandler(
      { user: { sub: 2 }, params: { projectId: "3" }, body: { teamName: "A", studentIds: ["x"] } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("maps archived project service errors to 409", async () => {
    (service.applyRandomAllocationForProject as any).mockRejectedValue({ code: "PROJECT_ARCHIVED" });
    const req: any = { user: { sub: 2 }, params: { projectId: "3" }, body: { teamCount: 2 } };
    const res = createResponse();
    await applyRandomAllocationHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("returns workspace payload from service", async () => {
    (service.getManualAllocationWorkspaceForProject as any).mockResolvedValue({ students: [], counts: { totalStudents: 0 } });
    const req: any = { user: { sub: 9 }, params: { projectId: "5" }, query: {} };
    const res = createResponse();
    await getManualAllocationWorkspaceHandler(req, res);
    expect(service.getManualAllocationWorkspaceForProject).toHaveBeenCalledWith(9, 5);
    expect(res.json).toHaveBeenCalled();
  });
});