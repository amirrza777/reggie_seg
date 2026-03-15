import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import {
  acceptTeamInviteHandler,
  addUserToTeamHandler,
  applyManualAllocationHandler,
  applyRandomAllocationHandler,
  cancelTeamInviteHandler,
  createTeamHandler,
  createTeamInviteHandler,
  declineTeamInviteHandler,
  expireTeamInviteHandler,
  getManualAllocationWorkspaceHandler,
  getTeamByIdHandler,
  getTeamMembersHandler,
  listTeamInvitesHandler,
  listReceivedInvitesHandler,
  previewRandomAllocationHandler,
  rejectTeamInviteHandler,
} from "./controller.js";

vi.mock("./service.js", () => ({
  createTeamInvite: vi.fn(),
  listTeamInvites: vi.fn(),
  listReceivedInvites: vi.fn(),
  createTeam: vi.fn(),
  getTeamById: vi.fn(),
  addUserToTeam: vi.fn(),
  getTeamMembers: vi.fn(),
  acceptTeamInvite: vi.fn(),
  declineTeamInvite: vi.fn(),
  rejectTeamInvite: vi.fn(),
  cancelTeamInvite: vi.fn(),
  expireTeamInvite: vi.fn(),
  applyManualAllocationForProject: vi.fn(),
  applyRandomAllocationForProject: vi.fn(),
  getManualAllocationWorkspaceForProject: vi.fn(),
  previewRandomAllocationForProject: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("teamAllocation controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createTeamInviteHandler returns 400 for invalid body", async () => {
    const req: any = { body: { teamId: "x", inviterId: 1, inviteeEmail: "" } };
    const res = mockResponse();

    await createTeamInviteHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("createTeamInviteHandler creates invite and returns id", async () => {
    (service.createTeamInvite as any).mockResolvedValue({ invite: { id: "invite-1" } });
    const req: any = {
      body: {
        teamId: 7,
        inviterId: 11,
        inviteeEmail: "User@Email.com",
        inviteeId: 21,
        message: "Join us",
      },
      headers: { origin: "https://app.test" },
      protocol: "http",
      get: vi.fn(),
    };
    const res = mockResponse();

    await createTeamInviteHandler(req, res);

    expect(service.createTeamInvite).toHaveBeenCalledWith({
      teamId: 7,
      inviterId: 11,
      inviteeEmail: "User@Email.com",
      inviteeId: 21,
      message: "Join us",
      baseUrl: "https://app.test",
    });
    expect(res.json).toHaveBeenCalledWith({ ok: true, inviteId: "invite-1" });
  });

  it("createTeamInviteHandler maps pending invite error to 409", async () => {
    (service.createTeamInvite as any).mockRejectedValue({ code: "INVITE_ALREADY_PENDING" });
    const req: any = {
      body: { teamId: 1, inviterId: 2, inviteeEmail: "a@b.com" },
      headers: {},
      protocol: "http",
      get: vi.fn().mockReturnValue("localhost:3000"),
    };
    const res = mockResponse();

    await createTeamInviteHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("listTeamInvitesHandler validates team id and returns data", async () => {
    const badReq: any = { params: { teamId: "abc" } };
    const badRes = mockResponse();
    await listTeamInvitesHandler(badReq, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.listTeamInvites as any).mockResolvedValue([{ id: "i1" }]);
    const req: any = { params: { teamId: "9" } };
    const res = mockResponse();
    await listTeamInvitesHandler(req, res);
    expect(service.listTeamInvites).toHaveBeenCalledWith(9);
    expect(res.json).toHaveBeenCalledWith([{ id: "i1" }]);
  });

  it("listReceivedInvitesHandler returns 401 without auth and returns data", async () => {
    const noAuthReq: any = { user: undefined };
    const noAuthRes = mockResponse();
    await listReceivedInvitesHandler(noAuthReq, noAuthRes);
    expect(noAuthRes.status).toHaveBeenCalledWith(401);

    (service.listReceivedInvites as any).mockResolvedValue([{ id: "inv-1" }]);
    const req: any = { user: { sub: 5 } };
    const res = mockResponse();
    await listReceivedInvitesHandler(req, res);
    expect(service.listReceivedInvites).toHaveBeenCalledWith(5);
    expect(res.json).toHaveBeenCalledWith([{ id: "inv-1" }]);
  });

  it("createTeamHandler validates body and returns 201", async () => {
    const badReq: any = { body: { userId: "x" } };
    const badRes = mockResponse();
    await createTeamHandler(badReq, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.createTeam as any).mockResolvedValue({ id: 1 });
    const req: any = { body: { userId: 5, teamData: { teamName: "A", projectId: 3 } } };
    const res = mockResponse();
    await createTeamHandler(req, res);
    expect(service.createTeam).toHaveBeenCalledWith(5, { teamName: "A", projectId: 3 });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("getTeamByIdHandler maps TEAM_NOT_FOUND to 404", async () => {
    (service.getTeamById as any).mockRejectedValue({ code: "TEAM_NOT_FOUND" });
    const req: any = { params: { teamId: "12" } };
    const res = mockResponse();

    await getTeamByIdHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("addUserToTeamHandler maps known errors", async () => {
    const req: any = { params: { teamId: "2" }, body: { userId: 3, role: "owner" } };
    const res = mockResponse();
    (service.addUserToTeam as any).mockResolvedValue({ teamId: 2, userId: 3 });
    await addUserToTeamHandler(req, res);
    expect(service.addUserToTeam).toHaveBeenCalledWith(2, 3, "OWNER");
    expect(res.status).toHaveBeenCalledWith(201);

    const notFoundRes = mockResponse();
    (service.addUserToTeam as any).mockRejectedValue({ code: "TEAM_NOT_FOUND" });
    await addUserToTeamHandler(req, notFoundRes);
    expect(notFoundRes.status).toHaveBeenCalledWith(404);

    const dupRes = mockResponse();
    (service.addUserToTeam as any).mockRejectedValue({ code: "MEMBER_ALREADY_EXISTS" });
    await addUserToTeamHandler(req, dupRes);
    expect(dupRes.status).toHaveBeenCalledWith(409);
  });

  it("getTeamMembersHandler validates id and maps not found", async () => {
    const badReq: any = { params: { teamId: "x" } };
    const badRes = mockResponse();
    await getTeamMembersHandler(badReq, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.getTeamMembers as any).mockRejectedValue({ code: "TEAM_NOT_FOUND" });
    const req: any = { params: { teamId: "2" } };
    const res = mockResponse();
    await getTeamMembersHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("previewRandomAllocationHandler validates auth and input", async () => {
    const unauthorizedReq: any = { user: undefined, params: { projectId: "3" }, query: { teamCount: "2" } };
    const unauthorizedRes = mockResponse();
    await previewRandomAllocationHandler(unauthorizedReq, unauthorizedRes);
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badProjectReq: any = { user: { sub: 9 }, params: { projectId: "x" }, query: { teamCount: "2" } };
    const badProjectRes = mockResponse();
    await previewRandomAllocationHandler(badProjectReq, badProjectRes);
    expect(badProjectRes.status).toHaveBeenCalledWith(400);

    const badCountReq: any = { user: { sub: 9 }, params: { projectId: "4" }, query: { teamCount: "0" } };
    const badCountRes = mockResponse();
    await previewRandomAllocationHandler(badCountReq, badCountRes);
    expect(badCountRes.status).toHaveBeenCalledWith(400);

    const badSeedReq: any = { user: { sub: 9 }, params: { projectId: "4" }, query: { teamCount: "2", seed: "abc" } };
    const badSeedRes = mockResponse();
    await previewRandomAllocationHandler(badSeedReq, badSeedRes);
    expect(badSeedRes.status).toHaveBeenCalledWith(400);
  });

  it("previewRandomAllocationHandler returns preview payload", async () => {
    (service.previewRandomAllocationForProject as any).mockResolvedValue({
      project: { id: 4, name: "Project A", moduleId: 1, moduleName: "Module A" },
      studentCount: 6,
      teamCount: 2,
      existingTeams: [],
      previewTeams: [],
    });

    const req: any = { user: { sub: 7 }, params: { projectId: "4" }, query: { teamCount: "2", seed: "99" } };
    const res = mockResponse();

    await previewRandomAllocationHandler(req, res);

    expect(service.previewRandomAllocationForProject).toHaveBeenCalledWith(7, 4, 2, { seed: 99 });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        project: expect.objectContaining({ id: 4 }),
        teamCount: 2,
      })
    );
  });

  it("previewRandomAllocationHandler maps service errors", async () => {
    const req: any = { user: { sub: 3 }, params: { projectId: "5" }, query: { teamCount: "2" } };

    (service.previewRandomAllocationForProject as any).mockRejectedValueOnce({ code: "TEAM_COUNT_EXCEEDS_STUDENT_COUNT" });
    const teamCountRes = mockResponse();
    await previewRandomAllocationHandler(req, teamCountRes);
    expect(teamCountRes.status).toHaveBeenCalledWith(400);

    (service.previewRandomAllocationForProject as any).mockRejectedValueOnce({ code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" });
    const missingRes = mockResponse();
    await previewRandomAllocationHandler(req, missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(404);

    (service.previewRandomAllocationForProject as any).mockRejectedValueOnce({ code: "PROJECT_ARCHIVED" });
    const archivedRes = mockResponse();
    await previewRandomAllocationHandler(req, archivedRes);
    expect(archivedRes.status).toHaveBeenCalledWith(409);

    (service.previewRandomAllocationForProject as any).mockRejectedValueOnce({ code: "NO_VACANT_STUDENTS" });
    const noStudentsRes = mockResponse();
    await previewRandomAllocationHandler(req, noStudentsRes);
    expect(noStudentsRes.status).toHaveBeenCalledWith(409);
  });

  it("getManualAllocationWorkspaceHandler validates auth and project id", async () => {
    const unauthorizedReq: any = { user: undefined, params: { projectId: "4" } };
    const unauthorizedRes = mockResponse();
    await getManualAllocationWorkspaceHandler(unauthorizedReq, unauthorizedRes);
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badProjectReq: any = { user: { sub: 9 }, params: { projectId: "x" } };
    const badProjectRes = mockResponse();
    await getManualAllocationWorkspaceHandler(badProjectReq, badProjectRes);
    expect(badProjectRes.status).toHaveBeenCalledWith(400);
  });

  it("getManualAllocationWorkspaceHandler returns workspace payload", async () => {
    (service.getManualAllocationWorkspaceForProject as any).mockResolvedValue({
      project: { id: 4, name: "Project A", moduleId: 1, moduleName: "Module A" },
      existingTeams: [],
      students: [],
      counts: {
        totalStudents: 0,
        availableStudents: 0,
        alreadyInTeamStudents: 0,
      },
    });

    const req: any = { user: { sub: 7 }, params: { projectId: "4" } };
    const res = mockResponse();

    await getManualAllocationWorkspaceHandler(req, res);

    expect(service.getManualAllocationWorkspaceForProject).toHaveBeenCalledWith(7, 4);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        project: expect.objectContaining({ id: 4 }),
      })
    );
  });

  it("getManualAllocationWorkspaceHandler maps service errors", async () => {
    const req: any = { user: { sub: 3 }, params: { projectId: "5" } };

    (service.getManualAllocationWorkspaceForProject as any).mockRejectedValueOnce({
      code: "PROJECT_NOT_FOUND_OR_FORBIDDEN",
    });
    const missingRes = mockResponse();
    await getManualAllocationWorkspaceHandler(req, missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(404);

    (service.getManualAllocationWorkspaceForProject as any).mockRejectedValueOnce({
      code: "PROJECT_ARCHIVED",
    });
    const archivedRes = mockResponse();
    await getManualAllocationWorkspaceHandler(req, archivedRes);
    expect(archivedRes.status).toHaveBeenCalledWith(409);
  });

  it("applyManualAllocationHandler validates auth and input", async () => {
    const unauthorizedReq: any = { user: undefined, params: { projectId: "3" }, body: { teamName: "Team A", studentIds: [1] } };
    const unauthorizedRes = mockResponse();
    await applyManualAllocationHandler(unauthorizedReq, unauthorizedRes);
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badProjectReq: any = { user: { sub: 9 }, params: { projectId: "x" }, body: { teamName: "Team A", studentIds: [1] } };
    const badProjectRes = mockResponse();
    await applyManualAllocationHandler(badProjectReq, badProjectRes);
    expect(badProjectRes.status).toHaveBeenCalledWith(400);

    const badStudentIdsReq: any = { user: { sub: 9 }, params: { projectId: "4" }, body: { teamName: "Team A", studentIds: "abc" } };
    const badStudentIdsRes = mockResponse();
    await applyManualAllocationHandler(badStudentIdsReq, badStudentIdsRes);
    expect(badStudentIdsRes.status).toHaveBeenCalledWith(400);

    const badStudentIdValueReq: any = {
      user: { sub: 9 },
      params: { projectId: "4" },
      body: { teamName: "Team A", studentIds: [1, "x"] },
    };
    const badStudentIdValueRes = mockResponse();
    await applyManualAllocationHandler(badStudentIdValueReq, badStudentIdValueRes);
    expect(badStudentIdValueRes.status).toHaveBeenCalledWith(400);
  });

  it("applyManualAllocationHandler returns applied payload", async () => {
    (service.applyManualAllocationForProject as any).mockResolvedValue({
      project: { id: 4, name: "Project A", moduleId: 1, moduleName: "Module A" },
      team: { id: 31, teamName: "Team Gamma", memberCount: 3 },
    });

    const req: any = { user: { sub: 7 }, params: { projectId: "4" }, body: { teamName: "Team Gamma", studentIds: [3, 4, 5] } };
    const res = mockResponse();

    await applyManualAllocationHandler(req, res);

    expect(service.applyManualAllocationForProject).toHaveBeenCalledWith(7, 4, {
      teamName: "Team Gamma",
      studentIds: [3, 4, 5],
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        project: expect.objectContaining({ id: 4 }),
        team: expect.objectContaining({ id: 31 }),
      })
    );
  });

  it("applyManualAllocationHandler maps service errors", async () => {
    const req: any = { user: { sub: 3 }, params: { projectId: "5" }, body: { teamName: "Team A", studentIds: [1, 2] } };

    (service.applyManualAllocationForProject as any).mockRejectedValueOnce({ code: "INVALID_TEAM_NAME" });
    const badNameRes = mockResponse();
    await applyManualAllocationHandler(req, badNameRes);
    expect(badNameRes.status).toHaveBeenCalledWith(400);

    (service.applyManualAllocationForProject as any).mockRejectedValueOnce({ code: "INVALID_STUDENT_IDS" });
    const badIdsRes = mockResponse();
    await applyManualAllocationHandler(req, badIdsRes);
    expect(badIdsRes.status).toHaveBeenCalledWith(400);

    (service.applyManualAllocationForProject as any).mockRejectedValueOnce({ code: "STUDENT_NOT_IN_MODULE" });
    const notInModuleRes = mockResponse();
    await applyManualAllocationHandler(req, notInModuleRes);
    expect(notInModuleRes.status).toHaveBeenCalledWith(400);

    (service.applyManualAllocationForProject as any).mockRejectedValueOnce({ code: "STUDENT_ALREADY_ASSIGNED" });
    const assignedRes = mockResponse();
    await applyManualAllocationHandler(req, assignedRes);
    expect(assignedRes.status).toHaveBeenCalledWith(409);

    (service.applyManualAllocationForProject as any).mockRejectedValueOnce({ code: "TEAM_NAME_ALREADY_EXISTS" });
    const duplicateNameRes = mockResponse();
    await applyManualAllocationHandler(req, duplicateNameRes);
    expect(duplicateNameRes.status).toHaveBeenCalledWith(409);

    (service.applyManualAllocationForProject as any).mockRejectedValueOnce({ code: "STUDENTS_NO_LONGER_AVAILABLE" });
    const staleRes = mockResponse();
    await applyManualAllocationHandler(req, staleRes);
    expect(staleRes.status).toHaveBeenCalledWith(409);
    expect(staleRes.json).toHaveBeenCalledWith({
      error: "Some selected students are no longer available. Refresh and try again.",
    });

    (service.applyManualAllocationForProject as any).mockRejectedValueOnce({ code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" });
    const missingRes = mockResponse();
    await applyManualAllocationHandler(req, missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(404);

    (service.applyManualAllocationForProject as any).mockRejectedValueOnce({ code: "PROJECT_ARCHIVED" });
    const archivedRes = mockResponse();
    await applyManualAllocationHandler(req, archivedRes);
    expect(archivedRes.status).toHaveBeenCalledWith(409);
  });

  it("applyRandomAllocationHandler validates auth and input", async () => {
    const unauthorizedReq: any = { user: undefined, params: { projectId: "3" }, body: { teamCount: 2 } };
    const unauthorizedRes = mockResponse();
    await applyRandomAllocationHandler(unauthorizedReq, unauthorizedRes);
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badProjectReq: any = { user: { sub: 9 }, params: { projectId: "x" }, body: { teamCount: 2 } };
    const badProjectRes = mockResponse();
    await applyRandomAllocationHandler(badProjectReq, badProjectRes);
    expect(badProjectRes.status).toHaveBeenCalledWith(400);

    const badCountReq: any = { user: { sub: 9 }, params: { projectId: "4" }, body: { teamCount: 0 } };
    const badCountRes = mockResponse();
    await applyRandomAllocationHandler(badCountReq, badCountRes);
    expect(badCountRes.status).toHaveBeenCalledWith(400);

    const badSeedReq: any = { user: { sub: 9 }, params: { projectId: "4" }, body: { teamCount: 2, seed: "abc" } };
    const badSeedRes = mockResponse();
    await applyRandomAllocationHandler(badSeedReq, badSeedRes);
    expect(badSeedRes.status).toHaveBeenCalledWith(400);

    const badTeamNamesReq: any = {
      user: { sub: 9 },
      params: { projectId: "4" },
      body: { teamCount: 2, teamNames: ["Team A", 1] },
    };
    const badTeamNamesRes = mockResponse();
    await applyRandomAllocationHandler(badTeamNamesReq, badTeamNamesRes);
    expect(badTeamNamesRes.status).toHaveBeenCalledWith(400);
  });

  it("applyRandomAllocationHandler returns applied payload", async () => {
    (service.applyRandomAllocationForProject as any).mockResolvedValue({
      project: { id: 4, name: "Project A", moduleId: 1, moduleName: "Module A" },
      studentCount: 6,
      teamCount: 2,
      appliedTeams: [{ id: 20, teamName: "Project 4 Random Team 1", memberCount: 3 }],
    });

    const req: any = {
      user: { sub: 7 },
      params: { projectId: "4" },
      body: { teamCount: 2, seed: 99, teamNames: ["Team Orion", "Team Vega"] },
    };
    const res = mockResponse();

    await applyRandomAllocationHandler(req, res);

    expect(service.applyRandomAllocationForProject).toHaveBeenCalledWith(7, 4, 2, {
      seed: 99,
      teamNames: ["Team Orion", "Team Vega"],
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        project: expect.objectContaining({ id: 4 }),
        teamCount: 2,
      })
    );
  });

  it("applyRandomAllocationHandler maps service errors", async () => {
    const req: any = { user: { sub: 3 }, params: { projectId: "5" }, body: { teamCount: 2 } };

    (service.applyRandomAllocationForProject as any).mockRejectedValueOnce({ code: "INVALID_TEAM_NAMES" });
    const badNamesRes = mockResponse();
    await applyRandomAllocationHandler(req, badNamesRes);
    expect(badNamesRes.status).toHaveBeenCalledWith(400);
    expect(badNamesRes.json).toHaveBeenCalledWith({
      error: "teamNames must contain one non-empty name per generated team",
    });

    (service.applyRandomAllocationForProject as any).mockRejectedValueOnce({ code: "DUPLICATE_TEAM_NAMES" });
    const duplicateNamesRes = mockResponse();
    await applyRandomAllocationHandler(req, duplicateNamesRes);
    expect(duplicateNamesRes.status).toHaveBeenCalledWith(400);
    expect(duplicateNamesRes.json).toHaveBeenCalledWith({
      error: "teamNames must be unique",
    });

    (service.applyRandomAllocationForProject as any).mockRejectedValueOnce({ code: "TEAM_COUNT_EXCEEDS_STUDENT_COUNT" });
    const teamCountRes = mockResponse();
    await applyRandomAllocationHandler(req, teamCountRes);
    expect(teamCountRes.status).toHaveBeenCalledWith(400);

    (service.applyRandomAllocationForProject as any).mockRejectedValueOnce({ code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" });
    const missingRes = mockResponse();
    await applyRandomAllocationHandler(req, missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(404);

    (service.applyRandomAllocationForProject as any).mockRejectedValueOnce({ code: "PROJECT_ARCHIVED" });
    const archivedRes = mockResponse();
    await applyRandomAllocationHandler(req, archivedRes);
    expect(archivedRes.status).toHaveBeenCalledWith(409);

    (service.applyRandomAllocationForProject as any).mockRejectedValueOnce({ code: "NO_VACANT_STUDENTS" });
    const noStudentsRes = mockResponse();
    await applyRandomAllocationHandler(req, noStudentsRes);
    expect(noStudentsRes.status).toHaveBeenCalledWith(409);

    (service.applyRandomAllocationForProject as any).mockRejectedValueOnce({ code: "STUDENTS_NO_LONGER_VACANT" });
    const stalePreviewRes = mockResponse();
    await applyRandomAllocationHandler(req, stalePreviewRes);
    expect(stalePreviewRes.status).toHaveBeenCalledWith(409);
    expect(stalePreviewRes.json).toHaveBeenCalledWith({
      error: "Some students are no longer vacant. Regenerate preview and try again.",
    });

    (service.applyRandomAllocationForProject as any).mockRejectedValueOnce({ code: "TEAM_NAME_ALREADY_EXISTS" });
    const duplicateExistingNameRes = mockResponse();
    await applyRandomAllocationHandler(req, duplicateExistingNameRes);
    expect(duplicateExistingNameRes.status).toHaveBeenCalledWith(409);
    expect(duplicateExistingNameRes.json).toHaveBeenCalledWith({
      error: "One or more team names already exist in this enterprise",
    });
  });
});

describe("teamAllocation invite transition handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for missing invite id", async () => {
    const req: any = { params: { inviteId: " " } };
    const res = mockResponse();

    await acceptTeamInviteHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("acceptTeamInviteHandler returns success payload", async () => {
    (service.acceptTeamInvite as any).mockResolvedValue({ id: "i1", status: "ACCEPTED" });
    const req: any = { user: { sub: 44 }, params: { inviteId: "i1" } };
    const res = mockResponse();

    await acceptTeamInviteHandler(req, res);

    expect(service.acceptTeamInvite).toHaveBeenCalledWith("i1", 44);
    expect(res.json).toHaveBeenCalledWith({ ok: true, invite: { id: "i1", status: "ACCEPTED" } });
  });

  it("maps INVITE_NOT_PENDING to 409 for all transition handlers", async () => {
    (service.declineTeamInvite as any).mockRejectedValue({ code: "INVITE_NOT_PENDING" });
    (service.rejectTeamInvite as any).mockRejectedValue({ code: "INVITE_NOT_PENDING" });
    (service.cancelTeamInvite as any).mockRejectedValue({ code: "INVITE_NOT_PENDING" });
    (service.expireTeamInvite as any).mockRejectedValue({ code: "INVITE_NOT_PENDING" });
    const req: any = { params: { inviteId: "i2" } };

    const declineRes = mockResponse();
    await declineTeamInviteHandler(req, declineRes);
    expect(declineRes.status).toHaveBeenCalledWith(409);

    const rejectRes = mockResponse();
    await rejectTeamInviteHandler(req, rejectRes);
    expect(rejectRes.status).toHaveBeenCalledWith(409);

    const cancelRes = mockResponse();
    await cancelTeamInviteHandler(req, cancelRes);
    expect(cancelRes.status).toHaveBeenCalledWith(409);

    const expireRes = mockResponse();
    await expireTeamInviteHandler(req, expireRes);
    expect(expireRes.status).toHaveBeenCalledWith(409);
  });
});