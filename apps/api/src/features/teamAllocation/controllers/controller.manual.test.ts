import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  service: {
    applyManualAllocationForProject: vi.fn(),
    getManualAllocationWorkspaceForProject: vi.fn(),
  },
  sendProjectOrModuleArchivedConflict: vi.fn(),
}));

vi.mock("../service/service.js", () => ({
  applyManualAllocationForProject: mocks.service.applyManualAllocationForProject,
  getManualAllocationWorkspaceForProject: mocks.service.getManualAllocationWorkspaceForProject,
}));

vi.mock("../../../shared/projectWriteGuard.js", () => ({
  sendProjectOrModuleArchivedConflict: mocks.sendProjectOrModuleArchivedConflict,
}));

import { applyManualAllocationHandler, getManualAllocationWorkspaceHandler } from "./controller.manual.js";

function createResponse() {
  const res = { status: vi.fn(), json: vi.fn() } as any;
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe("controller.manual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendProjectOrModuleArchivedConflict.mockReturnValue(false);
    mocks.service.getManualAllocationWorkspaceForProject.mockResolvedValue({ students: [], counts: { totalStudents: 0 } });
    mocks.service.applyManualAllocationForProject.mockResolvedValue({ team: { id: 1, teamName: "Blue", memberCount: 1 } });
  });

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
  });

  it("returns workspace payload from service", async () => {
    const req = { user: { sub: 4 }, params: { projectId: "7" }, query: { q: "ada" } };
    const res = createResponse();
    await getManualAllocationWorkspaceHandler(req as any, res);
    expect(mocks.service.getManualAllocationWorkspaceForProject).toHaveBeenCalledWith(4, 7, "ada");
    expect(res.json).toHaveBeenCalled();
  });

  it("maps workspace service errors", async () => {
    const req = { user: { sub: 4 }, params: { projectId: "7" }, query: {} };
    const res = createResponse();
    mocks.service.getManualAllocationWorkspaceForProject.mockRejectedValueOnce({ code: "INVALID_SEARCH_QUERY" });
    await getManualAllocationWorkspaceHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("maps workspace not-found and archived conflicts", async () => {
    const req = { user: { sub: 4 }, params: { projectId: "7" }, query: {} };
    const notFoundRes = createResponse();
    mocks.service.getManualAllocationWorkspaceForProject.mockRejectedValueOnce({ code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" });
    await getManualAllocationWorkspaceHandler(req as any, notFoundRes);
    expect(notFoundRes.status).toHaveBeenCalledWith(404);

    const archivedRes = createResponse();
    mocks.sendProjectOrModuleArchivedConflict.mockReturnValueOnce(true);
    mocks.service.getManualAllocationWorkspaceForProject.mockRejectedValueOnce({ code: "PROJECT_ARCHIVED" });
    await getManualAllocationWorkspaceHandler(req as any, archivedRes);
    expect(mocks.sendProjectOrModuleArchivedConflict).toHaveBeenCalled();
  });

  it("returns 500 for unexpected workspace errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const req = { user: { sub: 4 }, params: { projectId: "7" }, query: {} };
    const res = createResponse();
    mocks.service.getManualAllocationWorkspaceForProject.mockRejectedValueOnce(new Error("boom"));
    await getManualAllocationWorkspaceHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });

  it("returns 400 when manual studentIds payload is not numeric", async () => {
    const req = { user: { sub: 4 }, params: { projectId: "7" }, body: { teamName: "Gamma", studentIds: [1, "x"] } };
    const res = createResponse();
    await applyManualAllocationHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it.each([
    ["INVALID_TEAM_NAME", 400],
    ["INVALID_STUDENT_IDS", 400],
    ["STUDENT_NOT_IN_MODULE", 400],
    ["STUDENT_ALREADY_ASSIGNED", 409],
    ["TEAM_NAME_ALREADY_EXISTS", 409],
    ["STUDENTS_NO_LONGER_AVAILABLE", 409],
    ["PROJECT_NOT_FOUND_OR_FORBIDDEN", 404],
  ])("maps apply error code %s", async (code, status) => {
    const req = { user: { sub: 4 }, params: { projectId: "7" }, body: { teamName: "Gamma", studentIds: [1] } };
    const res = createResponse();
    mocks.service.applyManualAllocationForProject.mockRejectedValueOnce({ code });
    await applyManualAllocationHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(status);
  });

  it("returns 201 on successful manual allocation", async () => {
    const req = { user: { sub: 4 }, params: { projectId: "7" }, body: { teamName: "Gamma", studentIds: [1] } };
    const res = createResponse();
    await applyManualAllocationHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("maps archived and unexpected apply errors", async () => {
    const req = { user: { sub: 4 }, params: { projectId: "7" }, body: { teamName: "Gamma", studentIds: [1] } };
    const archivedRes = createResponse();
    mocks.sendProjectOrModuleArchivedConflict.mockReturnValueOnce(true);
    mocks.service.applyManualAllocationForProject.mockRejectedValueOnce({ code: "PROJECT_ARCHIVED" });
    await applyManualAllocationHandler(req as any, archivedRes);
    expect(mocks.sendProjectOrModuleArchivedConflict).toHaveBeenCalled();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failedRes = createResponse();
    mocks.service.applyManualAllocationForProject.mockRejectedValueOnce(new Error("boom"));
    await applyManualAllocationHandler(req as any, failedRes);
    expect(failedRes.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });
});