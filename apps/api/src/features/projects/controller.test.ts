import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import {
  createProjectHandler,
  getProjectByIdHandler,
  getProjectDeadlineHandler,
  getQuestionsForProjectHandler,
  getTeamByIdHandler,
  getTeamByUserAndProjectHandler,
  getTeammatesForProjectHandler,
  getUserModulesHandler,
  getUserProjectsHandler,
  createMcfRequestHandler,
  getMyMcfRequestsHandler,
  getStaffTeamMcfRequestsHandler,
} from "./controller.js";

vi.mock("./service.js", () => ({
  createProject: vi.fn(),
  fetchProjectById: vi.fn(),
  fetchProjectsForUser: vi.fn(),
  fetchModulesForUser: vi.fn(),
  fetchProjectDeadline: vi.fn(),
  fetchTeammatesForProject: vi.fn(),
  fetchTeamById: vi.fn(),
  fetchTeamByUserAndProject: vi.fn(),
  fetchQuestionsForProject: vi.fn(),
  submitMcfRequest: vi.fn(),
  fetchMyMcfRequests: vi.fn(),
  fetchTeamMcfRequestsForStaff: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("projects controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createProjectHandler validates payload", async () => {
    const res = mockResponse();
    await createProjectHandler({ body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("createProjectHandler creates project and returns 201", async () => {
    (service.createProject as any).mockResolvedValue({ id: 1, name: "P1" });
    const req: any = {
      body: { name: "P1", moduleId: 2, questionnaireTemplateId: 3, teamIds: [4, 5] },
    };
    const res = mockResponse();

    await createProjectHandler(req, res);

    expect(service.createProject).toHaveBeenCalledWith("P1", 2, 3, [4, 5]);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1, name: "P1" });
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

  it("getUserProjectsHandler validates user id and returns projects", async () => {
    const badRes = mockResponse();
    await getUserProjectsHandler({ query: { userId: "x" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchProjectsForUser as any).mockResolvedValue([{ id: 1, name: "P1", moduleName: "SEGP" }]);
    const res = mockResponse();
    await getUserProjectsHandler({ query: { userId: "7" } } as any, res);
    expect(service.fetchProjectsForUser).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalled();
  });

  it("getUserModulesHandler maps query scope to module fetch scope", async () => {
    const badRes = mockResponse();
    await getUserModulesHandler({ query: { userId: "x" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchModulesForUser as any).mockResolvedValue([{ id: "1", title: "M1" }]);
    const workspaceRes = mockResponse();
    await getUserModulesHandler({ query: { userId: "7" } } as any, workspaceRes);
    expect(service.fetchModulesForUser).toHaveBeenCalledWith(7, { staffOnly: false });

    const staffRes = mockResponse();
    await getUserModulesHandler({ query: { userId: "7", scope: "staff" } } as any, staffRes);
    expect(service.fetchModulesForUser).toHaveBeenCalledWith(7, { staffOnly: true });
  });

  it("getProjectDeadlineHandler validates ids and returns deadline", async () => {
    const badRes = mockResponse();
    await getProjectDeadlineHandler({ params: { projectId: "x" }, query: { userId: "1" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchProjectDeadline as any).mockResolvedValue({ taskDueDate: "2026-03-01", isOverridden: false });
    const res = mockResponse();
    await getProjectDeadlineHandler({ params: { projectId: "2" }, query: { userId: "1" } } as any, res);
    expect(service.fetchProjectDeadline).toHaveBeenCalledWith(1, 2);
    expect(res.json).toHaveBeenCalledWith({
      deadline: { taskDueDate: "2026-03-01", isOverridden: false },
    });
  });

  it("getTeammatesForProjectHandler validates ids and returns teammates", async () => {
    const badRes = mockResponse();
    await getTeammatesForProjectHandler({ params: { projectId: "x" }, query: { userId: "1" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchTeammatesForProject as any).mockResolvedValue([{ userId: 2 }]);
    const res = mockResponse();
    await getTeammatesForProjectHandler({ params: { projectId: "3" }, query: { userId: "1" } } as any, res);
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
    const badRes = mockResponse();
    await getTeamByUserAndProjectHandler(
      { params: { projectId: "x" }, query: { userId: "1" } } as any,
      badRes
    );
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchTeamByUserAndProject as any).mockResolvedValue(null);
    const missingRes = mockResponse();
    await getTeamByUserAndProjectHandler(
      { params: { projectId: "2" }, query: { userId: "1" } } as any,
      missingRes
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

  it("createMcfRequestHandler validates payload and creates request", async () => {
    const badRes = mockResponse();
    await createMcfRequestHandler({ params: { projectId: "x" }, body: { userId: 1 } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    const badBodyRes = mockResponse();
    await createMcfRequestHandler(
      { params: { projectId: "2" }, body: { userId: 7, subject: " ", details: "detail" } } as any,
      badBodyRes
    );
    expect(badBodyRes.status).toHaveBeenCalledWith(400);

    (service.submitMcfRequest as any).mockResolvedValue({
      id: 11,
      projectId: 2,
      teamId: 3,
      requesterUserId: 7,
      subject: "Need support",
      details: "Please review team dynamics",
      status: "OPEN",
    });
    const okRes = mockResponse();
    await createMcfRequestHandler(
      {
        params: { projectId: "2" },
        body: { userId: 7, subject: " Need support ", details: " Please review team dynamics " },
      } as any,
      okRes
    );
    expect(service.submitMcfRequest).toHaveBeenCalledWith(7, 2, "Need support", "Please review team dynamics");
    expect(okRes.status).toHaveBeenCalledWith(201);
    expect(okRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ id: 11, status: "OPEN" }),
      })
    );

    (service.submitMcfRequest as any).mockResolvedValue(null);
    const missingRes = mockResponse();
    await createMcfRequestHandler(
      { params: { projectId: "2" }, body: { userId: 7, subject: "Need", details: "Help" } } as any,
      missingRes
    );
    expect(missingRes.status).toHaveBeenCalledWith(404);
  });

  it("getMyMcfRequestsHandler validates ids and returns requester list", async () => {
    const badRes = mockResponse();
    await getMyMcfRequestsHandler({ params: { projectId: "x" }, query: { userId: "7" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchMyMcfRequests as any).mockResolvedValue([
      { id: 1, subject: "Need support", status: "OPEN" },
    ]);
    const okRes = mockResponse();
    await getMyMcfRequestsHandler({ params: { projectId: "3" }, query: { userId: "7" } } as any, okRes);
    expect(service.fetchMyMcfRequests).toHaveBeenCalledWith(7, 3);
    expect(okRes.json).toHaveBeenCalledWith({
      requests: [{ id: 1, subject: "Need support", status: "OPEN" }],
    });

    (service.fetchMyMcfRequests as any).mockResolvedValue(null);
    const missingRes = mockResponse();
    await getMyMcfRequestsHandler({ params: { projectId: "3" }, query: { userId: "7" } } as any, missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(404);
  });

  it("getStaffTeamMcfRequestsHandler validates ids and returns staff list", async () => {
    const badRes = mockResponse();
    await getStaffTeamMcfRequestsHandler(
      { params: { projectId: "x", teamId: "2" }, query: { userId: "7" } } as any,
      badRes
    );
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchTeamMcfRequestsForStaff as any).mockResolvedValue([
      { id: 4, subject: "Urgent", status: "IN_REVIEW" },
    ]);
    const okRes = mockResponse();
    await getStaffTeamMcfRequestsHandler(
      { params: { projectId: "3", teamId: "2" }, query: { userId: "7" } } as any,
      okRes
    );
    expect(service.fetchTeamMcfRequestsForStaff).toHaveBeenCalledWith(7, 3, 2);
    expect(okRes.json).toHaveBeenCalledWith({
      requests: [{ id: 4, subject: "Urgent", status: "IN_REVIEW" }],
    });

    (service.fetchTeamMcfRequestsForStaff as any).mockResolvedValue(null);
    const missingRes = mockResponse();
    await getStaffTeamMcfRequestsHandler(
      { params: { projectId: "3", teamId: "2" }, query: { userId: "7" } } as any,
      missingRes
    );
    expect(missingRes.status).toHaveBeenCalledWith(404);
  });
});
