import type { Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createTeamInviteMock = vi.fn();
const listTeamInvitesMock = vi.fn();
const listReceivedInvitesMock = vi.fn();
const createTeamMock = vi.fn();
const createTeamForProjectMock = vi.fn();
const getTeamByIdMock = vi.fn();
const addUserToTeamMock = vi.fn();
const getTeamMembersMock = vi.fn();
const acceptTeamInviteMock = vi.fn();
const declineTeamInviteMock = vi.fn();
const rejectTeamInviteMock = vi.fn();
const cancelTeamInviteMock = vi.fn();
const expireTeamInviteMock = vi.fn();
const applyManualAllocationForProjectMock = vi.fn();
const applyRandomAllocationForProjectMock = vi.fn();
const applyCustomAllocationForProjectMock = vi.fn();
const getCustomAllocationCoverageForProjectMock = vi.fn();
const listCustomAllocationQuestionnairesForProjectMock = vi.fn();
const getManualAllocationWorkspaceForProjectMock = vi.fn();
const previewCustomAllocationForProjectMock = vi.fn();
const previewRandomAllocationForProjectMock = vi.fn();

vi.mock("../../auth/middleware.js", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    const rawUserId = req.headers?.["x-user-id"];
    const parsedUserId = Number(rawUserId);
    if (!Number.isInteger(parsedUserId) || parsedUserId < 1) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = { sub: parsedUserId };
    return next();
  },
}));

vi.mock("./service.js", () => ({
  createTeamInvite: (...args: unknown[]) => createTeamInviteMock(...args),
  listTeamInvites: (...args: unknown[]) => listTeamInvitesMock(...args),
  listReceivedInvites: (...args: unknown[]) => listReceivedInvitesMock(...args),
  createTeam: (...args: unknown[]) => createTeamMock(...args),
  createTeamForProject: (...args: unknown[]) => createTeamForProjectMock(...args),
  getTeamById: (...args: unknown[]) => getTeamByIdMock(...args),
  addUserToTeam: (...args: unknown[]) => addUserToTeamMock(...args),
  getTeamMembers: (...args: unknown[]) => getTeamMembersMock(...args),
  acceptTeamInvite: (...args: unknown[]) => acceptTeamInviteMock(...args),
  declineTeamInvite: (...args: unknown[]) => declineTeamInviteMock(...args),
  rejectTeamInvite: (...args: unknown[]) => rejectTeamInviteMock(...args),
  cancelTeamInvite: (...args: unknown[]) => cancelTeamInviteMock(...args),
  expireTeamInvite: (...args: unknown[]) => expireTeamInviteMock(...args),
  applyManualAllocationForProject: (...args: unknown[]) => applyManualAllocationForProjectMock(...args),
  applyRandomAllocationForProject: (...args: unknown[]) => applyRandomAllocationForProjectMock(...args),
  applyCustomAllocationForProject: (...args: unknown[]) => applyCustomAllocationForProjectMock(...args),
  getCustomAllocationCoverageForProject: (...args: unknown[]) =>
    getCustomAllocationCoverageForProjectMock(...args),
  listCustomAllocationQuestionnairesForProject: (...args: unknown[]) =>
    listCustomAllocationQuestionnairesForProjectMock(...args),
  getManualAllocationWorkspaceForProject: (...args: unknown[]) =>
    getManualAllocationWorkspaceForProjectMock(...args),
  previewCustomAllocationForProject: (...args: unknown[]) =>
    previewCustomAllocationForProjectMock(...args),
  previewRandomAllocationForProject: (...args: unknown[]) => previewRandomAllocationForProjectMock(...args),
}));

import router from "./router.js";

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function getRouteHandlers(method: "get" | "post", path: string) {
  const layer = (router as any).stack.find(
    (entry: any) => entry.route?.path === path && entry.route.methods?.[method],
  );
  if (!layer) {
    throw new Error(`Missing route ${method.toUpperCase()} ${path}`);
  }
  return layer.route.stack.map((entry: any) => entry.handle);
}

async function runRoute(method: "get" | "post", path: string, req: any, res: Response) {
  const [authMiddleware, handler] = getRouteHandlers(method, path);
  const next = vi.fn();
  await authMiddleware(req, res, next);
  if (next.mock.calls.length > 0) {
    await handler(req, res);
  }
}

describe("teamAllocation router custom allocation integration", () => {
  beforeEach(() => {
    createTeamInviteMock.mockReset();
    listTeamInvitesMock.mockReset();
    listReceivedInvitesMock.mockReset();
    createTeamMock.mockReset();
    createTeamForProjectMock.mockReset();
    getTeamByIdMock.mockReset();
    addUserToTeamMock.mockReset();
    getTeamMembersMock.mockReset();
    acceptTeamInviteMock.mockReset();
    declineTeamInviteMock.mockReset();
    rejectTeamInviteMock.mockReset();
    cancelTeamInviteMock.mockReset();
    expireTeamInviteMock.mockReset();
    applyManualAllocationForProjectMock.mockReset();
    applyRandomAllocationForProjectMock.mockReset();
    applyCustomAllocationForProjectMock.mockReset();
    getCustomAllocationCoverageForProjectMock.mockReset();
    listCustomAllocationQuestionnairesForProjectMock.mockReset();
    getManualAllocationWorkspaceForProjectMock.mockReset();
    previewCustomAllocationForProjectMock.mockReset();
    previewRandomAllocationForProjectMock.mockReset();
  });

  it("enforces auth and maps permission errors for custom questionnaires", async () => {
    let req: any = { headers: {}, params: { projectId: "42" } };
    let res = mockRes();
    await runRoute("get", "/projects/:projectId/custom-questionnaires", req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });

    listCustomAllocationQuestionnairesForProjectMock.mockRejectedValueOnce({
      code: "PROJECT_NOT_FOUND_OR_FORBIDDEN",
    });
    req = { headers: { "x-user-id": "7" }, params: { projectId: "42" } };
    res = mockRes();
    await runRoute("get", "/projects/:projectId/custom-questionnaires", req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Project not found" });
  });

  it("rejects invalid custom preview payloads at route layer", async () => {
    const req: any = {
      headers: { "x-user-id": "7" },
      params: { projectId: "42" },
      body: {
        questionnaireTemplateId: 9,
        teamCount: 4,
        nonRespondentStrategy: "invalid",
        criteria: [],
      },
    };
    const res = mockRes();
    await runRoute("post", "/projects/:projectId/custom-preview", req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "nonRespondentStrategy must be either 'distribute_randomly' or 'exclude'",
    });
    expect(previewCustomAllocationForProjectMock).not.toHaveBeenCalled();
  });

  it("maps preview expiry on custom apply", async () => {
    applyCustomAllocationForProjectMock.mockRejectedValueOnce({
      code: "PREVIEW_NOT_FOUND_OR_EXPIRED",
    });
    const req: any = {
      headers: { "x-user-id": "7" },
      params: { projectId: "42" },
      body: { previewId: "custom-preview-1" },
    };
    const res = mockRes();
    await runRoute("post", "/projects/:projectId/custom-allocate", req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Preview no longer exists. Generate a new preview and try again.",
    });
  });

  it("maps stale vacancy conflicts with student details on custom apply", async () => {
    applyCustomAllocationForProjectMock.mockRejectedValueOnce({
      code: "STUDENTS_NO_LONGER_VACANT",
      staleStudents: [
        { id: 11, firstName: "Jin", lastName: "Johannesdottir", email: "jin@example.com" },
        { id: 12, firstName: "Sunil", lastName: "Stefansdottir", email: "sunil@example.com" },
      ],
    });
    const req: any = {
      headers: { "x-user-id": "7" },
      params: { projectId: "42" },
      body: { previewId: "custom-preview-1" },
    };
    const res = mockRes();
    await runRoute("post", "/projects/:projectId/custom-allocate", req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error:
        "Some students are no longer vacant: Jin Johannesdottir, Sunil Stefansdottir. Regenerate preview and try again.",
      staleStudents: [
        { id: 11, firstName: "Jin", lastName: "Johannesdottir", email: "jin@example.com" },
        { id: 12, firstName: "Sunil", lastName: "Stefansdottir", email: "sunil@example.com" },
      ],
    });
  });

  it("returns coverage payload for custom coverage endpoint", async () => {
    getCustomAllocationCoverageForProjectMock.mockResolvedValueOnce({
      project: { id: 42, name: "Project A", moduleId: 11, moduleName: "Module A" },
      questionnaireTemplateId: 5,
      totalAvailableStudents: 10,
      respondingStudents: 9,
      nonRespondingStudents: 1,
      responseRate: 90,
      responseThreshold: 85,
    });
    const req: any = {
      headers: { "x-user-id": "7" },
      params: { projectId: "42" },
      query: { questionnaireTemplateId: "5" },
    };
    const res = mockRes();
    await runRoute("get", "/projects/:projectId/custom-coverage", req, res);

    expect(res.json).toHaveBeenCalledWith({
      project: { id: 42, name: "Project A", moduleId: 11, moduleName: "Module A" },
      questionnaireTemplateId: 5,
      totalAvailableStudents: 10,
      respondingStudents: 9,
      nonRespondingStudents: 1,
      responseRate: 90,
      responseThreshold: 85,
    });
    expect(getCustomAllocationCoverageForProjectMock).toHaveBeenCalledWith(7, 42, 5);
  });
});