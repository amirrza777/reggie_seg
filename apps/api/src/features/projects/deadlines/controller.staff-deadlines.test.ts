import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import {
  clearStaffStudentDeadlineOverrideHandler,
  getStaffStudentDeadlineOverridesHandler,
  updateTeamDeadlineProfileHandler,
  upsertStaffStudentDeadlineOverrideHandler,
} from "./controller.staff-deadlines.js";
import {
  clearStaffStudentDeadlineOverride,
  fetchStaffStudentDeadlineOverrides,
  updateTeamDeadlineProfileForStaff,
  upsertStaffStudentDeadlineOverride,
} from "../service.js";
import {
  parseAuthenticatedUserId,
  parseDeadlineProfileBody,
  parseProjectIdParam,
  parseStaffStudentOverrideRoute,
  parseTeamIdParam,
} from "../controller.parsers.js";
import { parseStudentDeadlineOverridePayload } from "./controller.deadline-parsers.js";
import { sendProjectOrModuleArchivedConflict } from "../../../shared/projectWriteGuard.js";

vi.mock("../service.js", () => ({
  updateTeamDeadlineProfileForStaff: vi.fn(),
  fetchStaffStudentDeadlineOverrides: vi.fn(),
  upsertStaffStudentDeadlineOverride: vi.fn(),
  clearStaffStudentDeadlineOverride: vi.fn(),
}));

vi.mock("../controller.parsers.js", () => ({
  parseAuthenticatedUserId: vi.fn(),
  parseTeamIdParam: vi.fn(),
  parseDeadlineProfileBody: vi.fn(),
  parseProjectIdParam: vi.fn(),
  parseStaffStudentOverrideRoute: vi.fn(),
}));

vi.mock("./controller.deadline-parsers.js", () => ({
  parseStudentDeadlineOverridePayload: vi.fn(),
}));

vi.mock("../../../shared/projectWriteGuard.js", () => ({
  sendProjectOrModuleArchivedConflict: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("projects deadline staff controllers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (parseAuthenticatedUserId as any).mockReturnValue({ ok: true, value: 11 });
    (parseTeamIdParam as any).mockReturnValue({ ok: true, value: 22 });
    (parseDeadlineProfileBody as any).mockReturnValue({ ok: true, value: "MCF" });
    (parseProjectIdParam as any).mockReturnValue({ ok: true, value: 33 });
    (parseStaffStudentOverrideRoute as any).mockReturnValue({
      ok: true,
      value: { actorUserId: 11, projectId: 33, studentId: 44 },
    });
    (parseStudentDeadlineOverridePayload as any).mockReturnValue({
      ok: true,
      value: { taskDueDate: new Date("2026-01-12T09:00:00.000Z") },
    });
    (sendProjectOrModuleArchivedConflict as any).mockReturnValue(false);
  });

  it("updateTeamDeadlineProfileHandler validates auth and params", async () => {
    const unauthorizedRes = mockResponse();
    (parseAuthenticatedUserId as any).mockReturnValueOnce({ ok: false, error: "Unauthorized" });
    await updateTeamDeadlineProfileHandler({} as any, unauthorizedRes);
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badTeamRes = mockResponse();
    (parseTeamIdParam as any).mockReturnValueOnce({ ok: false, error: "Invalid team ID" });
    await updateTeamDeadlineProfileHandler({ params: { teamId: "x" } } as any, badTeamRes);
    expect(badTeamRes.status).toHaveBeenCalledWith(400);

    const badProfileRes = mockResponse();
    (parseDeadlineProfileBody as any).mockReturnValueOnce({ ok: false, error: "bad profile" });
    await updateTeamDeadlineProfileHandler({ params: { teamId: "22" }, body: {} } as any, badProfileRes);
    expect(badProfileRes.status).toHaveBeenCalledWith(400);
  });

  it("updateTeamDeadlineProfileHandler handles success and mapped failures", async () => {
    const req = { params: { teamId: "22" }, body: { deadlineProfile: "MCF" } } as any;
    const successRes = mockResponse();
    (updateTeamDeadlineProfileForStaff as any).mockResolvedValueOnce({ id: 22, deadlineProfile: "MCF" });
    await updateTeamDeadlineProfileHandler(req, successRes);
    expect(successRes.json).toHaveBeenCalledWith({ id: 22, deadlineProfile: "MCF" });

    const forbiddenRes = mockResponse();
    (updateTeamDeadlineProfileForStaff as any).mockRejectedValueOnce({ code: "FORBIDDEN" });
    await updateTeamDeadlineProfileHandler(req, forbiddenRes);
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);
    expect(forbiddenRes.json).toHaveBeenCalledWith({ error: "Forbidden" });

    const teamMissingRes = mockResponse();
    (updateTeamDeadlineProfileForStaff as any).mockRejectedValueOnce({ code: "TEAM_NOT_FOUND" });
    await updateTeamDeadlineProfileHandler(req, teamMissingRes);
    expect(teamMissingRes.status).toHaveBeenCalledWith(404);

    const archivedRes = mockResponse();
    (sendProjectOrModuleArchivedConflict as any).mockReturnValueOnce(true);
    (updateTeamDeadlineProfileForStaff as any).mockRejectedValueOnce({ code: "PROJECT_ARCHIVED" });
    await updateTeamDeadlineProfileHandler(req, archivedRes);
    expect(sendProjectOrModuleArchivedConflict).toHaveBeenCalled();
    expect(archivedRes.status).not.toHaveBeenCalledWith(500);

    const errorRes = mockResponse();
    (updateTeamDeadlineProfileForStaff as any).mockRejectedValueOnce(new Error("boom"));
    await updateTeamDeadlineProfileHandler(req, errorRes);
    expect(errorRes.status).toHaveBeenCalledWith(500);
  });

  it("getStaffStudentDeadlineOverridesHandler validates and maps errors", async () => {
    const unauthorizedRes = mockResponse();
    (parseAuthenticatedUserId as any).mockReturnValueOnce({ ok: false, error: "Unauthorized" });
    await getStaffStudentDeadlineOverridesHandler({} as any, unauthorizedRes);
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badProjectRes = mockResponse();
    (parseProjectIdParam as any).mockReturnValueOnce({ ok: false, error: "Invalid project ID" });
    await getStaffStudentDeadlineOverridesHandler({ params: { projectId: "bad" } } as any, badProjectRes);
    expect(badProjectRes.status).toHaveBeenCalledWith(400);

    const successRes = mockResponse();
    (fetchStaffStudentDeadlineOverrides as any).mockResolvedValueOnce([{ id: 1 }]);
    await getStaffStudentDeadlineOverridesHandler({ params: { projectId: "33" } } as any, successRes);
    expect(successRes.json).toHaveBeenCalledWith({ overrides: [{ id: 1 }] });

    const forbiddenRes = mockResponse();
    (fetchStaffStudentDeadlineOverrides as any).mockRejectedValueOnce({ code: "FORBIDDEN" });
    await getStaffStudentDeadlineOverridesHandler({ params: { projectId: "33" } } as any, forbiddenRes);
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);
    expect(forbiddenRes.json).toHaveBeenCalledWith({ error: "Forbidden" });

    const notFoundRes = mockResponse();
    (fetchStaffStudentDeadlineOverrides as any).mockRejectedValueOnce({ code: "PROJECT_NOT_FOUND" });
    await getStaffStudentDeadlineOverridesHandler({ params: { projectId: "33" } } as any, notFoundRes);
    expect(notFoundRes.status).toHaveBeenCalledWith(404);

    const errorRes = mockResponse();
    (fetchStaffStudentDeadlineOverrides as any).mockRejectedValueOnce(new Error("boom"));
    await getStaffStudentDeadlineOverridesHandler({ params: { projectId: "33" } } as any, errorRes);
    expect(errorRes.status).toHaveBeenCalledWith(500);
  });

  it("upsertStaffStudentDeadlineOverrideHandler validates route and payload", async () => {
    const unauthorizedRes = mockResponse();
    (parseStaffStudentOverrideRoute as any).mockReturnValueOnce({ ok: false, error: "Unauthorized" });
    await upsertStaffStudentDeadlineOverrideHandler({} as any, unauthorizedRes);
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badRouteRes = mockResponse();
    (parseStaffStudentOverrideRoute as any).mockReturnValueOnce({ ok: false, error: "Invalid project ID" });
    await upsertStaffStudentDeadlineOverrideHandler({} as any, badRouteRes);
    expect(badRouteRes.status).toHaveBeenCalledWith(400);

    const badPayloadRes = mockResponse();
    (parseStudentDeadlineOverridePayload as any).mockReturnValueOnce({ ok: false, error: "bad payload" });
    await upsertStaffStudentDeadlineOverrideHandler({ body: {} } as any, badPayloadRes);
    expect(badPayloadRes.status).toHaveBeenCalledWith(400);

    const noFieldsRes = mockResponse();
    (parseStudentDeadlineOverridePayload as any).mockReturnValueOnce({ ok: true, value: {} });
    await upsertStaffStudentDeadlineOverrideHandler({ body: {} } as any, noFieldsRes);
    expect(noFieldsRes.status).toHaveBeenCalledWith(400);
  });

  it("upsertStaffStudentDeadlineOverrideHandler handles success and mapped failures", async () => {
    const successRes = mockResponse();
    (upsertStaffStudentDeadlineOverride as any).mockResolvedValueOnce({ id: 5 });
    await upsertStaffStudentDeadlineOverrideHandler({ body: {} } as any, successRes);
    expect(successRes.json).toHaveBeenCalledWith({ override: { id: 5 } });

    const forbiddenRes = mockResponse();
    (upsertStaffStudentDeadlineOverride as any).mockRejectedValueOnce({ code: "FORBIDDEN" });
    await upsertStaffStudentDeadlineOverrideHandler({ body: {} } as any, forbiddenRes);
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);
    expect(forbiddenRes.json).toHaveBeenCalledWith({ error: "Forbidden" });

    const projectMissingRes = mockResponse();
    (upsertStaffStudentDeadlineOverride as any).mockRejectedValueOnce({ code: "PROJECT_NOT_FOUND" });
    await upsertStaffStudentDeadlineOverrideHandler({ body: {} } as any, projectMissingRes);
    expect(projectMissingRes.status).toHaveBeenCalledWith(404);

    const studentMissingRes = mockResponse();
    (upsertStaffStudentDeadlineOverride as any).mockRejectedValueOnce({ code: "STUDENT_NOT_IN_PROJECT" });
    await upsertStaffStudentDeadlineOverrideHandler({ body: {} } as any, studentMissingRes);
    expect(studentMissingRes.status).toHaveBeenCalledWith(404);

    const archivedRes = mockResponse();
    (sendProjectOrModuleArchivedConflict as any).mockReturnValueOnce(true);
    (upsertStaffStudentDeadlineOverride as any).mockRejectedValueOnce({ code: "MODULE_ARCHIVED" });
    await upsertStaffStudentDeadlineOverrideHandler({ body: {} } as any, archivedRes);
    expect(sendProjectOrModuleArchivedConflict).toHaveBeenCalled();
    expect(archivedRes.status).not.toHaveBeenCalledWith(500);

    const errorRes = mockResponse();
    (upsertStaffStudentDeadlineOverride as any).mockRejectedValueOnce(new Error("boom"));
    await upsertStaffStudentDeadlineOverrideHandler({ body: {} } as any, errorRes);
    expect(errorRes.status).toHaveBeenCalledWith(500);
  });

  it("clearStaffStudentDeadlineOverrideHandler validates route and maps errors", async () => {
    const unauthorizedRes = mockResponse();
    (parseStaffStudentOverrideRoute as any).mockReturnValueOnce({ ok: false, error: "Unauthorized" });
    await clearStaffStudentDeadlineOverrideHandler({} as any, unauthorizedRes);
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badRouteRes = mockResponse();
    (parseStaffStudentOverrideRoute as any).mockReturnValueOnce({ ok: false, error: "Invalid project ID" });
    await clearStaffStudentDeadlineOverrideHandler({} as any, badRouteRes);
    expect(badRouteRes.status).toHaveBeenCalledWith(400);

    const successRes = mockResponse();
    (clearStaffStudentDeadlineOverride as any).mockResolvedValueOnce({ cleared: true });
    await clearStaffStudentDeadlineOverrideHandler({} as any, successRes);
    expect(successRes.json).toHaveBeenCalledWith({ cleared: true });

    const forbiddenRes = mockResponse();
    (clearStaffStudentDeadlineOverride as any).mockRejectedValueOnce({ code: "FORBIDDEN" });
    await clearStaffStudentDeadlineOverrideHandler({} as any, forbiddenRes);
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);
    expect(forbiddenRes.json).toHaveBeenCalledWith({ error: "Forbidden" });

    const notFoundRes = mockResponse();
    (clearStaffStudentDeadlineOverride as any).mockRejectedValueOnce({ code: "PROJECT_NOT_FOUND" });
    await clearStaffStudentDeadlineOverrideHandler({} as any, notFoundRes);
    expect(notFoundRes.status).toHaveBeenCalledWith(404);

    const archivedRes = mockResponse();
    (sendProjectOrModuleArchivedConflict as any).mockReturnValueOnce(true);
    (clearStaffStudentDeadlineOverride as any).mockRejectedValueOnce({ code: "PROJECT_ARCHIVED" });
    await clearStaffStudentDeadlineOverrideHandler({} as any, archivedRes);
    expect(sendProjectOrModuleArchivedConflict).toHaveBeenCalled();
    expect(archivedRes.status).not.toHaveBeenCalledWith(500);

    const errorRes = mockResponse();
    (clearStaffStudentDeadlineOverride as any).mockRejectedValueOnce(new Error("boom"));
    await clearStaffStudentDeadlineOverrideHandler({} as any, errorRes);
    expect(errorRes.status).toHaveBeenCalledWith(500);
  });
});
