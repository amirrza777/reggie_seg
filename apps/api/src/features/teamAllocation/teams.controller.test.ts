import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  createTeam: vi.fn(),
  createTeamForProject: vi.fn(),
  getTeamById: vi.fn(),
  addUserToTeam: vi.fn(),
  getTeamMembers: vi.fn(),
}));

vi.mock("./service.js", () => ({
  createTeam: mocks.createTeam,
  createTeamForProject: mocks.createTeamForProject,
  getTeamById: mocks.getTeamById,
  addUserToTeam: mocks.addUserToTeam,
  getTeamMembers: mocks.getTeamMembers,
}));

import {
  addUserToTeamHandler,
  createTeamForProjectHandler,
  createTeamHandler,
  getTeamByIdHandler,
  getTeamMembersHandler,
} from "./teams.controller.js";

function createResponse() {
  const res = { status: vi.fn(), json: vi.fn() } as any;
  res.status.mockReturnValue(res);
  return res;
}

describe("teams.controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates createTeam request body", async () => {
    const res = createResponse();
    await createTeamHandler({ body: { userId: "", teamData: null } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid request body" });
  });

  it("creates team and maps 500 on failure", async () => {
    mocks.createTeam.mockResolvedValueOnce({ id: 1 });
    const okRes = createResponse();
    await createTeamHandler({ body: { userId: "7", teamData: { name: "A" } } } as any, okRes);
    expect(okRes.status).toHaveBeenCalledWith(201);
    expect(okRes.json).toHaveBeenCalledWith({ id: 1 });

    mocks.createTeam.mockRejectedValueOnce(new Error("boom"));
    const failRes = createResponse();
    await createTeamHandler({ body: { userId: "7", teamData: { name: "A" } } } as any, failRes);
    expect(failRes.status).toHaveBeenCalledWith(500);
  });

  it("validates createTeamForProject auth and inputs", async () => {
    const req = { body: { projectId: 7, teamName: "Team A" } };
    const res = createResponse();
    await createTeamForProjectHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("creates team for project and maps service errors", async () => {
    mocks.createTeamForProject.mockResolvedValueOnce({ id: 2 });
    const okRes = createResponse();
    await createTeamForProjectHandler({ user: { sub: 4 }, body: { projectId: 7, teamName: "Team A" } } as any, okRes);
    expect(okRes.status).toHaveBeenCalledWith(201);

    mocks.createTeamForProject.mockRejectedValueOnce({ code: "USER_NOT_FOUND" });
    const notFoundRes = createResponse();
    await createTeamForProjectHandler({ user: { sub: 4 }, body: { projectId: 7, teamName: "Team A" } } as any, notFoundRes);
    expect(notFoundRes.status).toHaveBeenCalledWith(404);

    mocks.createTeamForProject.mockRejectedValueOnce({ code: "TEAM_CREATION_FORBIDDEN" });
    const forbiddenRes = createResponse();
    await createTeamForProjectHandler({ user: { sub: 4 }, body: { projectId: 7, teamName: "Team A" } } as any, forbiddenRes);
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);

    mocks.createTeamForProject.mockRejectedValueOnce(new Error("boom"));
    const failRes = createResponse();
    await createTeamForProjectHandler({ user: { sub: 4 }, body: { projectId: 7, teamName: "Team A" } } as any, failRes);
    expect(failRes.status).toHaveBeenCalledWith(500);
  });

  it("returns 400 for invalid getTeamById param", async () => {
    const res = createResponse();
    await getTeamByIdHandler({ params: { teamId: "x" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns team by id and maps not-found/500", async () => {
    mocks.getTeamById.mockResolvedValueOnce({ id: 3 });
    const okRes = createResponse();
    await getTeamByIdHandler({ params: { teamId: "3" } } as any, okRes);
    expect(okRes.json).toHaveBeenCalledWith({ id: 3 });

    mocks.getTeamById.mockRejectedValueOnce({ code: "TEAM_NOT_FOUND" });
    const notFoundRes = createResponse();
    await getTeamByIdHandler({ params: { teamId: "3" } } as any, notFoundRes);
    expect(notFoundRes.status).toHaveBeenCalledWith(404);

    mocks.getTeamById.mockRejectedValueOnce(new Error("boom"));
    const failRes = createResponse();
    await getTeamByIdHandler({ params: { teamId: "3" } } as any, failRes);
    expect(failRes.status).toHaveBeenCalledWith(500);
  });

  it("returns 400 for invalid addUserToTeam body", async () => {
    const res = createResponse();
    await addUserToTeamHandler({ params: { teamId: "3" }, body: { userId: "x" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 for invalid addUserToTeam team id", async () => {
    const res = createResponse();
    await addUserToTeamHandler({ params: { teamId: "x" }, body: { userId: 7, role: "MEMBER" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("adds user to team and maps conflict/not-found/500", async () => {
    mocks.addUserToTeam.mockResolvedValueOnce({ teamId: 3, userId: 7, role: "MEMBER" });
    const okRes = createResponse();
    await addUserToTeamHandler({ params: { teamId: "3" }, body: { userId: 7, role: "MEMBER" } } as any, okRes);
    expect(okRes.status).toHaveBeenCalledWith(201);

    mocks.addUserToTeam.mockRejectedValueOnce({ code: "TEAM_NOT_FOUND" });
    const nfRes = createResponse();
    await addUserToTeamHandler({ params: { teamId: "3" }, body: { userId: 7, role: "MEMBER" } } as any, nfRes);
    expect(nfRes.status).toHaveBeenCalledWith(404);

    mocks.addUserToTeam.mockRejectedValueOnce({ code: "MEMBER_ALREADY_EXISTS" });
    const conflictRes = createResponse();
    await addUserToTeamHandler({ params: { teamId: "3" }, body: { userId: 7, role: "MEMBER" } } as any, conflictRes);
    expect(conflictRes.status).toHaveBeenCalledWith(409);

    mocks.addUserToTeam.mockRejectedValueOnce(new Error("boom"));
    const failRes = createResponse();
    await addUserToTeamHandler({ params: { teamId: "3" }, body: { userId: 7, role: "MEMBER" } } as any, failRes);
    expect(failRes.status).toHaveBeenCalledWith(500);
  });

  it("returns 400 for invalid getTeamMembers param", async () => {
    const res = createResponse();
    await getTeamMembersHandler({ params: { teamId: "x" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns team members and maps not-found/500", async () => {
    mocks.getTeamMembers.mockResolvedValueOnce([{ id: 1 }]);
    const okRes = createResponse();
    await getTeamMembersHandler({ params: { teamId: "7" } } as any, okRes);
    expect(okRes.json).toHaveBeenCalledWith([{ id: 1 }]);

    mocks.getTeamMembers.mockRejectedValueOnce({ code: "TEAM_NOT_FOUND" });
    const nfRes = createResponse();
    await getTeamMembersHandler({ params: { teamId: "7" } } as any, nfRes);
    expect(nfRes.status).toHaveBeenCalledWith(404);

    mocks.getTeamMembers.mockRejectedValueOnce(new Error("boom"));
    const failRes = createResponse();
    await getTeamMembersHandler({ params: { teamId: "7" } } as any, failRes);
    expect(failRes.status).toHaveBeenCalledWith(500);
  });
});
