/* eslint-disable max-lines-per-function, max-statements, @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockResponse } from "./controller.core.shared-test-helpers.js";
import * as service from "../../service.js";
import {
  getModuleStaffListHandler,
  getProjectByIdHandler,
  getProjectDeadlineHandler,
  getQuestionsForProjectHandler,
  getTeamByIdHandler,
  getTeamByUserAndProjectHandler,
  getTeammatesForProjectHandler,
  getUserModulesHandler,
  getUserProjectsHandler,
} from "../../controller.js";

describe("project read handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getProjectByIdHandler validates id, maps not found, returns project", async () => {
    const badRes = mockResponse();
    await getProjectByIdHandler({ params: { projectId: "abc" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchProjectById as any).mockResolvedValue(null);
    const missingRes = mockResponse();
    await getProjectByIdHandler({ params: { projectId: "1" } } as any, missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(404);

    (service.fetchProjectById as any).mockResolvedValue({ id: 1 });
    const okRes = mockResponse();
    await getProjectByIdHandler({ params: { projectId: "1" } } as any, okRes);
    expect(okRes.json).toHaveBeenCalledWith({ id: 1 });
  });

  it("getUserProjectsHandler requires auth and blocks user spoofing", async () => {
    const unauthorizedRes = mockResponse();
    await getUserProjectsHandler({ query: { userId: "7" } } as any, unauthorizedRes);
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badQueryRes = mockResponse();
    await getUserProjectsHandler({ user: { sub: 7 }, query: { userId: "x" } } as any, badQueryRes);
    expect(badQueryRes.status).toHaveBeenCalledWith(400);

    const forbiddenRes = mockResponse();
    await getUserProjectsHandler({ user: { sub: 7 }, query: { userId: "8" } } as any, forbiddenRes);
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);

    (service.fetchProjectsForUser as any).mockResolvedValue([{ id: 1, name: "P1", moduleName: "SEGP" }]);
    const res = mockResponse();
    await getUserProjectsHandler({ user: { sub: 7 }, query: { userId: "7" } } as any, res);
    expect(service.fetchProjectsForUser).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalled();
  });

  it("getUserModulesHandler maps query scope to module fetch scope", async () => {
    const unauthorizedRes = mockResponse();
    await getUserModulesHandler({ query: { userId: "7" } } as any, unauthorizedRes);
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badRes = mockResponse();
    await getUserModulesHandler({ user: { sub: 7 }, query: { userId: "x" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchModulesForUser as any).mockResolvedValue([{ id: "1", title: "M1" }]);
    const workspaceRes = mockResponse();
    await getUserModulesHandler({ user: { sub: 7 }, query: { userId: "7" } } as any, workspaceRes);
    expect(service.fetchModulesForUser).toHaveBeenCalledWith(7, { staffOnly: false, compact: false });

    const staffRes = mockResponse();
    await getUserModulesHandler({ user: { sub: 7 }, query: { userId: "7", scope: "staff" } } as any, staffRes);
    expect(service.fetchModulesForUser).toHaveBeenCalledWith(7, { staffOnly: true, compact: false });

    const compactRes = mockResponse();
    await getUserModulesHandler(
      { user: { sub: 7 }, query: { userId: "7", scope: "staff", compact: "1" } } as any,
      compactRes,
    );
    expect(service.fetchModulesForUser).toHaveBeenCalledWith(7, { staffOnly: true, compact: true });
  });

  it("getModuleStaffListHandler returns members or 403", async () => {
    const unauthorizedRes = mockResponse();
    await getModuleStaffListHandler({ params: { moduleId: "2" } } as any, unauthorizedRes);
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badRes = mockResponse();
    await getModuleStaffListHandler({ user: { sub: 7 }, params: { moduleId: "x" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchModuleStaffList as any).mockResolvedValueOnce({ ok: false, status: 403 });
    const forbiddenRes = mockResponse();
    await getModuleStaffListHandler({ user: { sub: 7 }, params: { moduleId: "3" } } as any, forbiddenRes);
    expect(service.fetchModuleStaffList).toHaveBeenCalledWith(7, 3);
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);

    (service.fetchModuleStaffList as any).mockResolvedValueOnce({
      ok: true,
      members: [{ userId: 1, email: "a@b.c", displayName: "A B", roles: ["LEAD"] }],
    });
    const okRes = mockResponse();
    await getModuleStaffListHandler({ user: { sub: 7 }, params: { moduleId: "3" } } as any, okRes);
    expect(okRes.json).toHaveBeenCalledWith({
      members: [{ userId: 1, email: "a@b.c", displayName: "A B", roles: ["LEAD"] }],
    });
  });

  it("getProjectDeadlineHandler validates ids and returns deadline", async () => {
    const unauthorizedRes = mockResponse();
    await getProjectDeadlineHandler({ params: { projectId: "2" }, query: { userId: "1" } } as any, unauthorizedRes);
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badRes = mockResponse();
    await getProjectDeadlineHandler({ user: { sub: 1 }, params: { projectId: "x" }, query: { userId: "1" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchProjectDeadline as any).mockResolvedValue({ taskDueDate: "2026-03-01", isOverridden: false });
    const res = mockResponse();
    await getProjectDeadlineHandler({ user: { sub: 1 }, params: { projectId: "2" }, query: { userId: "1" } } as any, res);
    expect(service.fetchProjectDeadline).toHaveBeenCalledWith(1, 2);
    expect(res.json).toHaveBeenCalledWith({
      deadline: { taskDueDate: "2026-03-01", isOverridden: false },
    });
  });

  it("getTeammatesForProjectHandler validates ids and returns teammates", async () => {
    const unauthorizedRes = mockResponse();
    await getTeammatesForProjectHandler({ params: { projectId: "3" }, query: { userId: "1" } } as any, unauthorizedRes);
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badRes = mockResponse();
    await getTeammatesForProjectHandler({ user: { sub: 1 }, params: { projectId: "x" }, query: { userId: "1" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchTeammatesForProject as any).mockResolvedValue([{ userId: 2 }]);
    const res = mockResponse();
    await getTeammatesForProjectHandler({ user: { sub: 1 }, params: { projectId: "3" }, query: { userId: "1" } } as any, res);
    expect(service.fetchTeammatesForProject).toHaveBeenCalledWith(1, 3);
    expect(res.json).toHaveBeenCalledWith({ teammates: [{ userId: 2 }] });
  });

  it("getTeamByIdHandler validates id and maps not found", async () => {
    const badRes = mockResponse();
    await getTeamByIdHandler({ params: { teamId: "abc" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchTeamById as any).mockResolvedValue(null);
    const missingRes = mockResponse();
    await getTeamByIdHandler({ params: { teamId: "1" } } as any, missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(404);
  });

  it("getTeamByUserAndProjectHandler validates ids and maps not found", async () => {
    const unauthorizedRes = mockResponse();
    await getTeamByUserAndProjectHandler(
      { params: { projectId: "2" }, query: { userId: "1" } } as any,
      unauthorizedRes,
    );
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badRes = mockResponse();
    await getTeamByUserAndProjectHandler(
      { user: { sub: 1 }, params: { projectId: "x" }, query: { userId: "1" } } as any,
      badRes,
    );
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchTeamByUserAndProject as any).mockResolvedValue(null);
    const missingRes = mockResponse();
    await getTeamByUserAndProjectHandler(
      { user: { sub: 1 }, params: { projectId: "2" }, query: { userId: "1" } } as any,
      missingRes,
    );
    expect(missingRes.status).toHaveBeenCalledWith(404);
  });

  it("getQuestionsForProjectHandler validates id and maps missing template", async () => {
    const badRes = mockResponse();
    await getQuestionsForProjectHandler({ params: { projectId: "x" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchQuestionsForProject as any).mockResolvedValue({ questionnaireTemplate: null });
    const missingRes = mockResponse();
    await getQuestionsForProjectHandler({ params: { projectId: "10" } } as any, missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(404);

    (service.fetchQuestionsForProject as any).mockResolvedValue({
      questionnaireTemplate: { id: 5, questions: [{ id: 1 }] },
    });
    const okRes = mockResponse();
    await getQuestionsForProjectHandler({ params: { projectId: "10" } } as any, okRes);
    expect(okRes.json).toHaveBeenCalledWith({ id: 5, questions: [{ id: 1 }] });
  });

  it("maps generic and migration errors for read handlers", async () => {
    (service.fetchProjectById as any).mockRejectedValueOnce(new Error("db-fail"));
    const projectErrorRes = mockResponse();
    await getProjectByIdHandler({ params: { projectId: "1" } } as any, projectErrorRes);
    expect(projectErrorRes.status).toHaveBeenCalledWith(500);

    (service.fetchProjectsForUser as any).mockRejectedValueOnce(new Error("db-fail"));
    const userProjectsErrorRes = mockResponse();
    await getUserProjectsHandler({ user: { sub: 4 } } as any, userProjectsErrorRes);
    expect(userProjectsErrorRes.status).toHaveBeenCalledWith(500);

    (service.fetchProjectDeadline as any)
      .mockRejectedValueOnce({ code: "P2021" })
      .mockRejectedValueOnce(new Error("deadline-fail"));
    const deadlineMigrationRes = mockResponse();
    await getProjectDeadlineHandler({ user: { sub: 4 }, params: { projectId: "2" } } as any, deadlineMigrationRes);
    expect(deadlineMigrationRes.status).toHaveBeenCalledWith(503);
    const deadlineErrorRes = mockResponse();
    await getProjectDeadlineHandler({ user: { sub: 4 }, params: { projectId: "2" } } as any, deadlineErrorRes);
    expect(deadlineErrorRes.status).toHaveBeenCalledWith(500);

    (service.fetchTeammatesForProject as any)
      .mockRejectedValueOnce({ code: "P2022" })
      .mockRejectedValueOnce(new Error("teammates-fail"));
    const teammatesMigrationRes = mockResponse();
    await getTeammatesForProjectHandler({ user: { sub: 4 }, params: { projectId: "2" } } as any, teammatesMigrationRes);
    expect(teammatesMigrationRes.status).toHaveBeenCalledWith(503);
    const teammatesErrorRes = mockResponse();
    await getTeammatesForProjectHandler({ user: { sub: 4 }, params: { projectId: "2" } } as any, teammatesErrorRes);
    expect(teammatesErrorRes.status).toHaveBeenCalledWith(500);

    (service.fetchTeamById as any)
      .mockResolvedValueOnce({ id: 7, teamName: "Team 7" })
      .mockRejectedValueOnce({ code: "P2021" })
      .mockRejectedValueOnce(new Error("team-fail"));
    const teamOkRes = mockResponse();
    await getTeamByIdHandler({ params: { teamId: "7" } } as any, teamOkRes);
    expect(teamOkRes.json).toHaveBeenCalledWith({ id: 7, teamName: "Team 7" });
    const teamMigrationRes = mockResponse();
    await getTeamByIdHandler({ params: { teamId: "7" } } as any, teamMigrationRes);
    expect(teamMigrationRes.status).toHaveBeenCalledWith(503);
    const teamErrorRes = mockResponse();
    await getTeamByIdHandler({ params: { teamId: "7" } } as any, teamErrorRes);
    expect(teamErrorRes.status).toHaveBeenCalledWith(500);

    (service.fetchTeamByUserAndProject as any)
      .mockResolvedValueOnce({ id: 9, projectId: 2 })
      .mockRejectedValueOnce({ code: "P2022" })
      .mockRejectedValueOnce(new Error("team-user-fail"));
    const teamByUserOkRes = mockResponse();
    await getTeamByUserAndProjectHandler({ user: { sub: 4 }, params: { projectId: "2" } } as any, teamByUserOkRes);
    expect(teamByUserOkRes.json).toHaveBeenCalledWith({ id: 9, projectId: 2 });
    const teamByUserMigrationRes = mockResponse();
    await getTeamByUserAndProjectHandler({ user: { sub: 4 }, params: { projectId: "2" } } as any, teamByUserMigrationRes);
    expect(teamByUserMigrationRes.status).toHaveBeenCalledWith(503);
    const teamByUserErrorRes = mockResponse();
    await getTeamByUserAndProjectHandler({ user: { sub: 4 }, params: { projectId: "2" } } as any, teamByUserErrorRes);
    expect(teamByUserErrorRes.status).toHaveBeenCalledWith(500);

    (service.fetchQuestionsForProject as any).mockRejectedValueOnce(new Error("question-fail"));
    const questionsErrorRes = mockResponse();
    await getQuestionsForProjectHandler({ params: { projectId: "2" } } as any, questionsErrorRes);
    expect(questionsErrorRes.status).toHaveBeenCalledWith(500);
  });
});
