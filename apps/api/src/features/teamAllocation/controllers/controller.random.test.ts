import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  service: {
    applyRandomAllocationForProject: vi.fn(),
    previewRandomAllocationForProject: vi.fn(),
  },
  sendProjectOrModuleArchivedConflict: vi.fn(),
}));

vi.mock("../service/service.js", () => ({
  applyRandomAllocationForProject: mocks.service.applyRandomAllocationForProject,
  previewRandomAllocationForProject: mocks.service.previewRandomAllocationForProject,
}));

vi.mock("../../../shared/projectWriteGuard.js", () => ({
  sendProjectOrModuleArchivedConflict: mocks.sendProjectOrModuleArchivedConflict,
}));

import { applyRandomAllocationHandler, previewRandomAllocationHandler } from "./controller.random.js";

function createResponse() {
  const res = { status: vi.fn(), json: vi.fn() } as any;
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe("controller.random", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendProjectOrModuleArchivedConflict.mockReturnValue(false);
    mocks.service.previewRandomAllocationForProject.mockResolvedValue({ teamCount: 2, previewTeams: [] });
    mocks.service.applyRandomAllocationForProject.mockResolvedValue({ teamCount: 2, appliedTeams: [] });
  });

  it("returns 401 when preview auth is missing", async () => {
    const res = createResponse();
    await previewRandomAllocationHandler({ params: { projectId: "2" }, query: { teamCount: "2" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 for invalid preview query", async () => {
    const req = { user: { sub: 8 }, params: { projectId: "2" }, query: { teamCount: "2", minTeamSize: "4", maxTeamSize: "3" } };
    const res = createResponse();
    await previewRandomAllocationHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("calls preview service without optional constraints", async () => {
    const req = { user: { sub: 8 }, params: { projectId: "2" }, query: { teamCount: "2" } };
    const res = createResponse();
    await previewRandomAllocationHandler(req as any, res);
    expect(mocks.service.previewRandomAllocationForProject).toHaveBeenCalledWith(8, 2, 2);
  });

  it("calls preview service with optional constraints", async () => {
    const req = { user: { sub: 8 }, params: { projectId: "2" }, query: { teamCount: "2", minTeamSize: "1" } };
    const res = createResponse();
    await previewRandomAllocationHandler(req as any, res);
    expect(mocks.service.previewRandomAllocationForProject).toHaveBeenCalledWith(8, 2, 2, { minTeamSize: 1 });
  });

  it.each([
    ["INVALID_TEAM_COUNT", 400],
    ["INVALID_MIN_TEAM_SIZE", 400],
    ["INVALID_MAX_TEAM_SIZE", 400],
    ["INVALID_TEAM_SIZE_RANGE", 400],
    ["TEAM_SIZE_CONSTRAINTS_UNSATISFIABLE", 400],
    ["TEAM_COUNT_EXCEEDS_STUDENT_COUNT", 400],
    ["PROJECT_NOT_FOUND_OR_FORBIDDEN", 404],
    ["NO_VACANT_STUDENTS", 409],
  ])("maps preview service error %s", async (code, status) => {
    const req = { user: { sub: 8 }, params: { projectId: "2" }, query: { teamCount: "2" } };
    const res = createResponse();
    mocks.service.previewRandomAllocationForProject.mockRejectedValueOnce({ code });
    await previewRandomAllocationHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(status);
  });

  it("maps archived and unexpected preview errors", async () => {
    const req = { user: { sub: 8 }, params: { projectId: "2" }, query: { teamCount: "2" } };
    const archivedRes = createResponse();
    mocks.sendProjectOrModuleArchivedConflict.mockReturnValueOnce(true);
    mocks.service.previewRandomAllocationForProject.mockRejectedValueOnce({ code: "PROJECT_ARCHIVED" });
    await previewRandomAllocationHandler(req as any, archivedRes);
    expect(mocks.sendProjectOrModuleArchivedConflict).toHaveBeenCalled();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failedRes = createResponse();
    mocks.service.previewRandomAllocationForProject.mockRejectedValueOnce(new Error("boom"));
    await previewRandomAllocationHandler(req as any, failedRes);
    expect(failedRes.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });

  it("returns 400 when apply body is invalid", async () => {
    const req = { user: { sub: 8 }, params: { projectId: "2" }, body: { teamCount: 2, teamNames: 123 } };
    const res = createResponse();
    await applyRandomAllocationHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 201 for successful random allocation apply", async () => {
    const req = { user: { sub: 8 }, params: { projectId: "2" }, body: { teamCount: 2 } };
    const res = createResponse();
    await applyRandomAllocationHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it.each([
    ["INVALID_TEAM_COUNT", 400],
    ["INVALID_MIN_TEAM_SIZE", 400],
    ["INVALID_MAX_TEAM_SIZE", 400],
    ["INVALID_TEAM_SIZE_RANGE", 400],
    ["TEAM_SIZE_CONSTRAINTS_UNSATISFIABLE", 400],
    ["INVALID_TEAM_NAMES", 400],
    ["DUPLICATE_TEAM_NAMES", 400],
    ["TEAM_COUNT_EXCEEDS_STUDENT_COUNT", 400],
    ["PROJECT_NOT_FOUND_OR_FORBIDDEN", 404],
    ["NO_VACANT_STUDENTS", 409],
    ["STUDENTS_NO_LONGER_VACANT", 409],
    ["TEAM_NAME_ALREADY_EXISTS", 409],
  ])("maps apply service error %s", async (code, status) => {
    const req = { user: { sub: 8 }, params: { projectId: "2" }, body: { teamCount: 2 } };
    const res = createResponse();
    mocks.service.applyRandomAllocationForProject.mockRejectedValueOnce({ code });
    await applyRandomAllocationHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(status);
  });

  it("maps archived and unexpected apply errors", async () => {
    const req = { user: { sub: 8 }, params: { projectId: "2" }, body: { teamCount: 2 } };
    const archivedRes = createResponse();
    mocks.sendProjectOrModuleArchivedConflict.mockReturnValueOnce(true);
    mocks.service.applyRandomAllocationForProject.mockRejectedValueOnce({ code: "PROJECT_ARCHIVED" });
    await applyRandomAllocationHandler(req as any, archivedRes);
    expect(mocks.sendProjectOrModuleArchivedConflict).toHaveBeenCalled();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failedRes = createResponse();
    mocks.service.applyRandomAllocationForProject.mockRejectedValueOnce(new Error("boom"));
    await applyRandomAllocationHandler(req as any, failedRes);
    expect(failedRes.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });
});