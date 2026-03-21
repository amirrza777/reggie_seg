import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import {
  createProjectHandler,
  getProjectByIdHandler,
  getProjectDeadlineHandler,
  getProjectMarkingHandler,
  getQuestionsForProjectHandler,
  getStaffProjectTeamsHandler,
  getStaffProjectsHandler,
  getTeamByIdHandler,
  getTeamByUserAndProjectHandler,
  getTeammatesForProjectHandler,
  getUserModulesHandler,
  getUserProjectsHandler,
  createTeamHealthMessageHandler,
  getMyTeamHealthMessagesHandler,
  getStaffTeamHealthMessagesHandler,
  createStaffTeamWarningHandler,
  getStaffTeamWarningsHandler,
  getMyTeamWarningsHandler,
  updateProjectWarningsEnabledHandler,
} from "./controller.js";

vi.mock("./service.js", () => ({
  createProject: vi.fn(),
  fetchProjectById: vi.fn(),
  fetchProjectMarking: vi.fn(),
  fetchProjectTeamsForStaff: vi.fn(),
  fetchProjectsForUser: vi.fn(),
  fetchProjectsForStaff: vi.fn(),
  fetchModulesForUser: vi.fn(),
  fetchProjectDeadline: vi.fn(),
  fetchTeammatesForProject: vi.fn(),
  fetchTeamById: vi.fn(),
  fetchTeamByUserAndProject: vi.fn(),
  fetchQuestionsForProject: vi.fn(),
  submitTeamHealthMessage: vi.fn(),
  fetchMyTeamHealthMessages: vi.fn(),
  fetchTeamHealthMessagesForStaff: vi.fn(),
  createTeamWarningForStaff: vi.fn(),
  fetchTeamWarningsForStaff: vi.fn(),
  fetchMyTeamWarnings: vi.fn(),
  updateProjectWarningsEnabledForStaff: vi.fn(),
  updateTeamDeadlineProfileForStaff: vi.fn(),
  fetchStaffStudentDeadlineOverrides: vi.fn(),
  upsertStaffStudentDeadlineOverride: vi.fn(),
  clearStaffStudentDeadlineOverride: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

const deadlinePayload = {
  taskOpenDate: "2026-03-01T09:00:00.000Z",
  taskDueDate: "2026-03-08T17:00:00.000Z",
  taskDueDateMcf: "2026-03-15T17:00:00.000Z",
  assessmentOpenDate: "2026-03-09T09:00:00.000Z",
  assessmentDueDate: "2026-03-12T17:00:00.000Z",
  assessmentDueDateMcf: "2026-03-19T17:00:00.000Z",
  feedbackOpenDate: "2026-03-13T09:00:00.000Z",
  feedbackDueDate: "2026-03-16T17:00:00.000Z",
  feedbackDueDateMcf: "2026-03-23T17:00:00.000Z",
};

describe("projects controller core handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createProjectHandler validates payload", async () => {
    const res = mockResponse();
    await createProjectHandler({ user: { sub: 1 }, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("createProjectHandler requires authenticated user", async () => {
    const res = mockResponse();
    await createProjectHandler({ body: { name: "P1", moduleId: 2, questionnaireTemplateId: 3, deadline: deadlinePayload } } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("createProjectHandler creates project and returns 201", async () => {
    (service.createProject as any).mockResolvedValue({ id: 1, name: "P1" });
    const req: any = {
      user: { sub: 42 },
      body: { name: "P1", moduleId: 2, questionnaireTemplateId: 3, deadline: deadlinePayload },
    };
    const res = mockResponse();

    await createProjectHandler(req, res);

    expect(service.createProject).toHaveBeenCalledWith(
      42,
      "P1",
      2,
      3,
      expect.objectContaining({
        taskOpenDate: expect.any(Date),
        taskDueDate: expect.any(Date),
        taskDueDateMcf: expect.any(Date),
        assessmentOpenDate: expect.any(Date),
        assessmentDueDate: expect.any(Date),
        assessmentDueDateMcf: expect.any(Date),
        feedbackOpenDate: expect.any(Date),
        feedbackDueDate: expect.any(Date),
        feedbackDueDateMcf: expect.any(Date),
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1, name: "P1" });
  });

  it("createProjectHandler validates deadline payload", async () => {
    const resMissing = mockResponse();
    await createProjectHandler(
      { user: { sub: 1 }, body: { name: "P1", moduleId: 2, questionnaireTemplateId: 3 } } as any,
      resMissing,
    );
    expect(resMissing.status).toHaveBeenCalledWith(400);

    const resOrder = mockResponse();
    await createProjectHandler(
      {
        user: { sub: 1 },
        body: {
          name: "P1",
          moduleId: 2,
          questionnaireTemplateId: 3,
          deadline: {
            ...deadlinePayload,
            taskOpenDate: deadlinePayload.taskDueDate,
          },
        },
      } as any,
      resOrder,
    );
    expect(resOrder.status).toHaveBeenCalledWith(400);
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

  it("getStaffProjectsHandler and getStaffProjectTeamsHandler use authenticated user id", async () => {
    const staffProjectsRes = mockResponse();
    (service.fetchProjectsForStaff as any).mockResolvedValue([{ id: 1, name: "P1" }]);
    await getStaffProjectsHandler({ user: { sub: 12 }, query: { userId: "12" } } as any, staffProjectsRes);
    expect(service.fetchProjectsForStaff).toHaveBeenCalledWith(12);
    expect(staffProjectsRes.json).toHaveBeenCalledWith([{ id: 1, name: "P1" }]);

    const staffTeamsRes = mockResponse();
    (service.fetchProjectTeamsForStaff as any).mockResolvedValue({
      project: { id: 9, name: "P9", moduleId: 1, moduleName: "M1" },
      teams: [],
    });
    await getStaffProjectTeamsHandler(
      { user: { sub: 12 }, params: { projectId: "9" }, query: { userId: "12" } } as any,
      staffTeamsRes,
    );
    expect(service.fetchProjectTeamsForStaff).toHaveBeenCalledWith(12, 9);
    expect(staffTeamsRes.json).toHaveBeenCalledWith({
      project: { id: 9, name: "P9", moduleId: 1, moduleName: "M1" },
      teams: [],
    });
  });

  it("getProjectMarkingHandler uses authenticated user id", async () => {
    (service.fetchProjectMarking as any).mockResolvedValue({
      teamId: 5,
      teamMarking: null,
      studentMarking: null,
    });
    const res = mockResponse();
    await getProjectMarkingHandler(
      { user: { sub: 4 }, params: { projectId: "5" }, query: { userId: "4" } } as any,
      res,
    );
    expect(service.fetchProjectMarking).toHaveBeenCalledWith(4, 5);
    expect(res.json).toHaveBeenCalledWith({
      teamId: 5,
      teamMarking: null,
      studentMarking: null,
    });
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

  it("createTeamHealthMessageHandler validates payload and creates request", async () => {
    const badRes = mockResponse();
    await createTeamHealthMessageHandler({ params: { projectId: "x" }, body: { userId: 1 } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    const badBodyRes = mockResponse();
    await createTeamHealthMessageHandler(
      { params: { projectId: "2" }, body: { userId: 7, subject: " ", details: "detail" } } as any,
      badBodyRes
    );
    expect(badBodyRes.status).toHaveBeenCalledWith(400);

    (service.submitTeamHealthMessage as any).mockResolvedValue({
      id: 11,
      projectId: 2,
      teamId: 3,
      requesterUserId: 7,
      subject: "Need support",
      details: "Please review team dynamics",
      resolved: false,
    });
    const okRes = mockResponse();
    await createTeamHealthMessageHandler(
      {
        params: { projectId: "2" },
        body: { userId: 7, subject: " Need support ", details: " Please review team dynamics " },
      } as any,
      okRes
    );
    expect(service.submitTeamHealthMessage).toHaveBeenCalledWith(7, 2, "Need support", "Please review team dynamics");
    expect(okRes.status).toHaveBeenCalledWith(201);
    expect(okRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ id: 11, resolved: false }),
      })
    );

    (service.submitTeamHealthMessage as any).mockResolvedValue(null);
    const missingRes = mockResponse();
    await createTeamHealthMessageHandler(
      { params: { projectId: "2" }, body: { userId: 7, subject: "Need", details: "Help" } } as any,
      missingRes
    );
    expect(missingRes.status).toHaveBeenCalledWith(404);
  });

  it("getMyTeamHealthMessagesHandler validates ids and returns requester list", async () => {
    const badRes = mockResponse();
    await getMyTeamHealthMessagesHandler({ params: { projectId: "x" }, query: { userId: "7" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchMyTeamHealthMessages as any).mockResolvedValue([
      { id: 1, subject: "Need support", resolved: false },
    ]);
    const okRes = mockResponse();
    await getMyTeamHealthMessagesHandler({ params: { projectId: "3" }, query: { userId: "7" } } as any, okRes);
    expect(service.fetchMyTeamHealthMessages).toHaveBeenCalledWith(7, 3);
    expect(okRes.json).toHaveBeenCalledWith({
      requests: [{ id: 1, subject: "Need support", resolved: false }],
    });

    (service.fetchMyTeamHealthMessages as any).mockResolvedValue(null);
    const missingRes = mockResponse();
    await getMyTeamHealthMessagesHandler({ params: { projectId: "3" }, query: { userId: "7" } } as any, missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(404);
  });

  it("getStaffTeamHealthMessagesHandler validates ids and returns staff list", async () => {
    const badRes = mockResponse();
    await getStaffTeamHealthMessagesHandler(
      { params: { projectId: "x", teamId: "2" }, query: { userId: "7" } } as any,
      badRes
    );
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchTeamHealthMessagesForStaff as any).mockResolvedValue([
      { id: 4, subject: "Urgent", resolved: false },
    ]);
    const okRes = mockResponse();
    await getStaffTeamHealthMessagesHandler(
      { params: { projectId: "3", teamId: "2" }, query: { userId: "7" } } as any,
      okRes
    );
    expect(service.fetchTeamHealthMessagesForStaff).toHaveBeenCalledWith(7, 3, 2);
    expect(okRes.json).toHaveBeenCalledWith({
      requests: [{ id: 4, subject: "Urgent", resolved: false }],
    });

    (service.fetchTeamHealthMessagesForStaff as any).mockResolvedValue(null);
    const missingRes = mockResponse();
    await getStaffTeamHealthMessagesHandler(
      { params: { projectId: "3", teamId: "2" }, query: { userId: "7" } } as any,
      missingRes
    );
    expect(missingRes.status).toHaveBeenCalledWith(404);
  });

  it("updateProjectWarningsEnabledHandler validates input and updates setting", async () => {
    const unauthorizedRes = mockResponse();
    await updateProjectWarningsEnabledHandler(
      { params: { projectId: "3" }, body: { warningsEnabled: true } } as any,
      unauthorizedRes,
    );
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badProjectRes = mockResponse();
    await updateProjectWarningsEnabledHandler(
      { user: { sub: 7 }, params: { projectId: "x" }, body: { warningsEnabled: true } } as any,
      badProjectRes,
    );
    expect(badProjectRes.status).toHaveBeenCalledWith(400);

    const badBodyRes = mockResponse();
    await updateProjectWarningsEnabledHandler(
      { user: { sub: 7 }, params: { projectId: "3" }, body: { warningsEnabled: "true" } } as any,
      badBodyRes,
    );
    expect(badBodyRes.status).toHaveBeenCalledWith(400);

    (service.updateProjectWarningsEnabledForStaff as any).mockResolvedValueOnce({ id: 3, warningsEnabled: true });
    const okRes = mockResponse();
    await updateProjectWarningsEnabledHandler(
      { user: { sub: 7 }, params: { projectId: "3" }, body: { warningsEnabled: true } } as any,
      okRes,
    );
    expect(service.updateProjectWarningsEnabledForStaff).toHaveBeenCalledWith(7, 3, true);
    expect(okRes.json).toHaveBeenCalledWith({ id: 3, warningsEnabled: true });

    (service.updateProjectWarningsEnabledForStaff as any).mockRejectedValueOnce({
      code: "FORBIDDEN",
      message: "Only module leads can update warning settings",
    });
    const forbiddenRes = mockResponse();
    await updateProjectWarningsEnabledHandler(
      { user: { sub: 7 }, params: { projectId: "3" }, body: { warningsEnabled: false } } as any,
      forbiddenRes,
    );
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);

    (service.updateProjectWarningsEnabledForStaff as any).mockRejectedValueOnce({ code: "PROJECT_NOT_FOUND" });
    const notFoundRes = mockResponse();
    await updateProjectWarningsEnabledHandler(
      { user: { sub: 7 }, params: { projectId: "3" }, body: { warningsEnabled: false } } as any,
      notFoundRes,
    );
    expect(notFoundRes.status).toHaveBeenCalledWith(404);
  });

  it("createStaffTeamWarningHandler validates payload and delegates create", async () => {
    const unauthorizedRes = mockResponse();
    await createStaffTeamWarningHandler(
      {
        query: {},
        params: { projectId: "3", teamId: "2" },
        body: { type: "LOW", severity: "HIGH", title: "T", details: "D" },
      } as any,
      unauthorizedRes,
    );
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badBodyRes = mockResponse();
    await createStaffTeamWarningHandler(
      { user: { sub: 7 }, query: {}, params: { projectId: "3", teamId: "2" }, body: { type: "", severity: "BAD" } } as any,
      badBodyRes,
    );
    expect(badBodyRes.status).toHaveBeenCalledWith(400);

    (service.createTeamWarningForStaff as any).mockResolvedValueOnce({ id: 101, active: true });
    const okRes = mockResponse();
    await createStaffTeamWarningHandler(
      {
        user: { sub: 7 },
        query: { userId: "7" },
        params: { projectId: "3", teamId: "2" },
        body: { type: "LOW_ATTENDANCE", severity: "HIGH", title: "Attendance low", details: "70% below threshold" },
      } as any,
      okRes,
    );
    expect(service.createTeamWarningForStaff).toHaveBeenCalledWith(
      7,
      3,
      2,
      expect.objectContaining({ type: "LOW_ATTENDANCE", severity: "HIGH" }),
    );
    expect(okRes.status).toHaveBeenCalledWith(201);

    (service.createTeamWarningForStaff as any).mockResolvedValueOnce(null);
    const missingRes = mockResponse();
    await createStaffTeamWarningHandler(
      {
        user: { sub: 7 },
        query: { userId: "7" },
        params: { projectId: "3", teamId: "2" },
        body: { type: "LOW_ATTENDANCE", severity: "HIGH", title: "Attendance low", details: "70% below threshold" },
      } as any,
      missingRes,
    );
    expect(missingRes.status).toHaveBeenCalledWith(404);

    (service.createTeamWarningForStaff as any).mockRejectedValueOnce({ code: "WARNINGS_DISABLED" });
    const disabledRes = mockResponse();
    await createStaffTeamWarningHandler(
      {
        user: { sub: 7 },
        query: { userId: "7" },
        params: { projectId: "3", teamId: "2" },
        body: { type: "LOW_ATTENDANCE", severity: "HIGH", title: "Attendance low", details: "70% below threshold" },
      } as any,
      disabledRes,
    );
    expect(disabledRes.status).toHaveBeenCalledWith(409);
  });

  it("getStaffTeamWarningsHandler validates ids and returns warnings", async () => {
    const badRes = mockResponse();
    await getStaffTeamWarningsHandler(
      { user: { sub: 7 }, query: {}, params: { projectId: "x", teamId: "2" } } as any,
      badRes,
    );
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchTeamWarningsForStaff as any).mockResolvedValueOnce([{ id: 7 }]);
    const okRes = mockResponse();
    await getStaffTeamWarningsHandler(
      { user: { sub: 7 }, query: { userId: "7" }, params: { projectId: "3", teamId: "2" } } as any,
      okRes,
    );
    expect(service.fetchTeamWarningsForStaff).toHaveBeenCalledWith(7, 3, 2);
    expect(okRes.json).toHaveBeenCalledWith({ warnings: [{ id: 7 }] });

    (service.fetchTeamWarningsForStaff as any).mockResolvedValueOnce(null);
    const missingRes = mockResponse();
    await getStaffTeamWarningsHandler(
      { user: { sub: 7 }, query: { userId: "7" }, params: { projectId: "3", teamId: "2" } } as any,
      missingRes,
    );
    expect(missingRes.status).toHaveBeenCalledWith(404);
  });

  it("getMyTeamWarningsHandler validates project id and returns warnings", async () => {
    const badRes = mockResponse();
    await getMyTeamWarningsHandler(
      { user: { sub: 7 }, params: { projectId: "x" }, query: { userId: "7" } } as any,
      badRes,
    );
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchMyTeamWarnings as any).mockResolvedValueOnce([{ id: 5, active: true }]);
    const okRes = mockResponse();
    await getMyTeamWarningsHandler(
      { user: { sub: 7 }, params: { projectId: "3" }, query: { userId: "7" } } as any,
      okRes,
    );
    expect(service.fetchMyTeamWarnings).toHaveBeenCalledWith(7, 3);
    expect(okRes.json).toHaveBeenCalledWith({ warnings: [{ id: 5, active: true }] });

    (service.fetchMyTeamWarnings as any).mockResolvedValueOnce(null);
    const missingRes = mockResponse();
    await getMyTeamWarningsHandler(
      { user: { sub: 7 }, params: { projectId: "3" }, query: { userId: "7" } } as any,
      missingRes,
    );
    expect(missingRes.status).toHaveBeenCalledWith(404);
  });
});
