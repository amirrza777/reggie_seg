import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  service: {
    addUserToTeam: vi.fn(),
    createTeam: vi.fn(),
    createTeamForProject: vi.fn(),
    getTeamById: vi.fn(),
    getTeamMembers: vi.fn(),
  },
}));

vi.mock("../service/service.js", () => ({
  addUserToTeam: mocks.service.addUserToTeam,
  createTeam: mocks.service.createTeam,
  createTeamForProject: mocks.service.createTeamForProject,
  getTeamById: mocks.service.getTeamById,
  getTeamMembers: mocks.service.getTeamMembers,
}));

import {
  addUserToTeamHandler,
  createTeamForProjectHandler,
  createTeamHandler,
  getTeamByIdHandler,
  getTeamMembersHandler,
} from "./controller.teams.js";

function createResponse() {
  const res = { status: vi.fn(), json: vi.fn() } as any;
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe("controller.teams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.service.createTeam.mockResolvedValue({ id: 1 });
    mocks.service.createTeamForProject.mockResolvedValue({ id: 2, teamName: "Blue" });
    mocks.service.getTeamById.mockResolvedValue({ id: 2 });
    mocks.service.addUserToTeam.mockResolvedValue({ teamId: 2, userId: 5 });
    mocks.service.getTeamMembers.mockResolvedValue([{ id: 5 }]);
  });

  it("createTeam validates auth and body", async () => {
    const unauth = createResponse();
    await createTeamHandler({ body: { teamData: { projectId: 7, teamName: "A" } } } as any, unauth);
    expect(unauth.status).toHaveBeenCalledWith(401);

    const invalidBody = createResponse();
    await createTeamHandler({ user: { sub: 4 }, body: {} } as any, invalidBody);
    expect(invalidBody.status).toHaveBeenCalledWith(400);
  });

  it("createTeam returns 201 on success", async () => {
    const res = createResponse();
    await createTeamHandler({ user: { sub: 4 }, body: { teamData: { projectId: 7, teamName: "A" } } } as any, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it.each([
    ["TEAM_CREATION_FORBIDDEN", 403],
    ["PROJECT_NOT_FOUND_OR_FORBIDDEN", 404],
    ["STUDENT_ALREADY_IN_TEAM", 409],
    ["INVALID_PROJECT_ID", 400],
    ["INVALID_TEAM_NAME", 400],
    ["TEAM_NAME_ALREADY_EXISTS", 409],
    ["USER_NOT_FOUND", 404],
  ])("createTeam maps service error %s", async (code, status) => {
    const req = { user: { sub: 4 }, body: { teamData: { projectId: 7, teamName: "A" } } };
    const res = createResponse();
    mocks.service.createTeam.mockRejectedValueOnce({ code });
    await createTeamHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(status);
  });

  it("createTeam maps unexpected errors to 500", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const req = { user: { sub: 4 }, body: { teamData: { projectId: 7, teamName: "A" } } };
    const res = createResponse();
    mocks.service.createTeam.mockRejectedValueOnce(new Error("boom"));
    await createTeamHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });

  it("createTeamForProject validates body and maps service errors", async () => {
    const invalid = createResponse();
    await createTeamForProjectHandler({ user: { sub: 4 }, body: { projectId: "x", teamName: "" } } as any, invalid);
    expect(invalid.status).toHaveBeenCalledWith(400);

    const req = { user: { sub: 4 }, body: { projectId: 8, teamName: "Blue" } };
    const res = createResponse();
    mocks.service.createTeamForProject.mockRejectedValueOnce({ code: "TEAM_NAME_ALREADY_EXISTS" });
    await createTeamForProjectHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("createTeamForProject returns 401 without authenticated staff actor", async () => {
    const res = createResponse();
    await createTeamForProjectHandler({ body: { projectId: 8, teamName: "Blue" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it.each([
    ["TEAM_CREATION_FORBIDDEN", 403],
    ["PROJECT_NOT_FOUND_OR_FORBIDDEN", 404],
    ["STUDENT_ALREADY_IN_TEAM", 409],
    ["INVALID_TEAM_NAME", 400],
    ["TEAM_NAME_ALREADY_EXISTS", 409],
    ["USER_NOT_FOUND", 404],
  ])("createTeamForProject maps service error %s", async (code, status) => {
    const req = { user: { sub: 4 }, body: { projectId: 8, teamName: "Blue" } };
    const res = createResponse();
    mocks.service.createTeamForProject.mockRejectedValueOnce({ code });
    await createTeamForProjectHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(status);
  });

  it("createTeamForProject maps unexpected service errors to 500", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const req = { user: { sub: 4 }, body: { projectId: 8, teamName: "Blue" } };
    const res = createResponse();
    mocks.service.createTeamForProject.mockRejectedValueOnce(new Error("boom"));
    await createTeamForProjectHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });

  it("createTeamForProject returns 201 on success", async () => {
    const res = createResponse();
    await createTeamForProjectHandler({ user: { sub: 4 }, body: { projectId: 8, teamName: "Blue" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("getTeamById validates id and maps service errors", async () => {
    const invalid = createResponse();
    await getTeamByIdHandler({ params: { teamId: "nope" } } as any, invalid);
    expect(invalid.status).toHaveBeenCalledWith(400);

    const notFound = createResponse();
    mocks.service.getTeamById.mockRejectedValueOnce({ code: "TEAM_NOT_FOUND" });
    await getTeamByIdHandler({ params: { teamId: "3" } } as any, notFound);
    expect(notFound.status).toHaveBeenCalledWith(404);
  });

  it("getTeamById returns team on success and maps unexpected errors", async () => {
    const ok = createResponse();
    await getTeamByIdHandler({ params: { teamId: "3" } } as any, ok);
    expect(ok.json).toHaveBeenCalledWith({ id: 2 });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failed = createResponse();
    mocks.service.getTeamById.mockRejectedValueOnce(new Error("boom"));
    await getTeamByIdHandler({ params: { teamId: "3" } } as any, failed);
    expect(failed.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });

  it("addUserToTeam validates payload and maps service errors", async () => {
    const invalid = createResponse();
    await addUserToTeamHandler({ params: { teamId: "12" }, body: { userId: "bad" } } as any, invalid);
    expect(invalid.status).toHaveBeenCalledWith(400);

    const conflict = createResponse();
    mocks.service.addUserToTeam.mockRejectedValueOnce({ code: "MEMBER_ALREADY_EXISTS" });
    await addUserToTeamHandler({ params: { teamId: "12" }, body: { userId: 5 } } as any, conflict);
    expect(conflict.status).toHaveBeenCalledWith(409);
  });

  it("addUserToTeam returns created allocation and maps unexpected errors", async () => {
    const ok = createResponse();
    await addUserToTeamHandler({ params: { teamId: "12" }, body: { userId: 5, role: "MEMBER" } } as any, ok);
    expect(ok.status).toHaveBeenCalledWith(201);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failed = createResponse();
    mocks.service.addUserToTeam.mockRejectedValueOnce(new Error("boom"));
    await addUserToTeamHandler({ params: { teamId: "12" }, body: { userId: 5 } } as any, failed);
    expect(failed.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });

  it("getTeamMembers validates id and maps service errors", async () => {
    const invalid = createResponse();
    await getTeamMembersHandler({ params: { teamId: "bad" } } as any, invalid);
    expect(invalid.status).toHaveBeenCalledWith(400);

    const missing = createResponse();
    mocks.service.getTeamMembers.mockRejectedValueOnce({ code: "TEAM_NOT_FOUND" });
    await getTeamMembersHandler({ params: { teamId: "12" } } as any, missing);
    expect(missing.status).toHaveBeenCalledWith(404);
  });

  it("getTeamMembers returns members on success", async () => {
    const res = createResponse();
    await getTeamMembersHandler({ params: { teamId: "12" } } as any, res);
    expect(res.json).toHaveBeenCalledWith([{ id: 5 }]);
  });

  it("getTeamMembers maps unexpected service errors to 500", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = createResponse();
    mocks.service.getTeamMembers.mockRejectedValueOnce(new Error("boom"));
    await getTeamMembersHandler({ params: { teamId: "12" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });
});