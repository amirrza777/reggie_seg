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

describe("teamAllocation controller invites and teams", () => {
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
});
