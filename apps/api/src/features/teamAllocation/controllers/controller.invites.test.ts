import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  service: {
    acceptTeamInvite: vi.fn(),
    cancelTeamInvite: vi.fn(),
    createTeamInvite: vi.fn(),
    declineTeamInvite: vi.fn(),
    expireTeamInvite: vi.fn(),
    listInviteEligibleStudents: vi.fn(),
    listReceivedInvites: vi.fn(),
    listTeamInvites: vi.fn(),
    rejectTeamInvite: vi.fn(),
  },
}));

vi.mock("../service/service.js", () => ({
  acceptTeamInvite: mocks.service.acceptTeamInvite,
  cancelTeamInvite: mocks.service.cancelTeamInvite,
  createTeamInvite: mocks.service.createTeamInvite,
  declineTeamInvite: mocks.service.declineTeamInvite,
  expireTeamInvite: mocks.service.expireTeamInvite,
  listInviteEligibleStudents: mocks.service.listInviteEligibleStudents,
  listReceivedInvites: mocks.service.listReceivedInvites,
  listTeamInvites: mocks.service.listTeamInvites,
  rejectTeamInvite: mocks.service.rejectTeamInvite,
}));

import {
  acceptTeamInviteHandler,
  cancelTeamInviteHandler,
  createTeamInviteHandler,
  declineTeamInviteHandler,
  expireTeamInviteHandler,
  listInviteEligibleStudentsHandler,
  listReceivedInvitesHandler,
  listTeamInvitesHandler,
  rejectTeamInviteHandler,
} from "./controller.invites.js";

function createResponse() {
  const res = { status: vi.fn(), json: vi.fn() } as any;
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe("controller.invites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.service.createTeamInvite.mockResolvedValue({ invite: { id: "inv-1" } });
    mocks.service.listInviteEligibleStudents.mockResolvedValue([{ id: 2 }]);
    mocks.service.listTeamInvites.mockResolvedValue([{ id: "inv-1" }]);
    mocks.service.listReceivedInvites.mockResolvedValue([{ id: "inv-2" }]);
  });

  it("validates auth/body for createTeamInvite", async () => {
    const unauth = createResponse();
    await createTeamInviteHandler({ body: { teamId: 2, inviteeEmail: "x@y.com" } } as any, unauth);
    expect(unauth.status).toHaveBeenCalledWith(401);

    const invalid = createResponse();
    await createTeamInviteHandler({ user: { sub: 4 }, body: { teamId: "x", inviteeEmail: "bad" } } as any, invalid);
    expect(invalid.status).toHaveBeenCalledWith(400);
  });

  it("createTeamInvite resolves with invite id and baseUrl", async () => {
    const req = {
      user: { sub: 4 },
      body: { teamId: 2, inviteeEmail: "x@y.com", message: "hi" },
      headers: { origin: "https://app.example.com" },
      get: vi.fn().mockReturnValue("fallback-host"),
      protocol: "http",
    };
    const res = createResponse();
    await createTeamInviteHandler(req as any, res);
    expect(mocks.service.createTeamInvite).toHaveBeenCalledWith(expect.objectContaining({ baseUrl: "https://app.example.com" }));
    expect(res.json).toHaveBeenCalledWith({ ok: true, inviteId: "inv-1" });
  });

  it("createTeamInvite uses protocol+host fallback baseUrl and forwards inviteeId", async () => {
    const req = {
      user: { sub: 4 },
      body: { teamId: 2, inviteeEmail: "x@y.com", inviteeId: 99 },
      headers: {},
      get: vi.fn().mockReturnValue("fallback-host"),
      protocol: "https",
    };
    const res = createResponse();
    await createTeamInviteHandler(req as any, res);
    expect(mocks.service.createTeamInvite).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: "https://fallback-host", inviteeId: 99 }),
    );
  });

  it.each([
    ["TEAM_NOT_FOUND", 404],
    ["TEAM_ARCHIVED", 409],
    ["TEAM_NOT_ACTIVE", 409],
    ["TEAM_ACCESS_FORBIDDEN", 403],
    ["INVITE_ALREADY_PENDING", 409],
    ["INVITEE_NOT_ELIGIBLE_FOR_PROJECT", 400],
  ])("createTeamInvite maps service error %s", async (code, status) => {
    const req = { user: { sub: 4 }, body: { teamId: 2, inviteeEmail: "x@y.com" }, headers: {}, get: vi.fn(), protocol: "http" };
    const res = createResponse();
    mocks.service.createTeamInvite.mockRejectedValueOnce({ code });
    await createTeamInviteHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(status);
  });

  it("createTeamInvite maps unexpected service errors to 500", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const req = { user: { sub: 4 }, body: { teamId: 2, inviteeEmail: "x@y.com" }, headers: {}, get: vi.fn(), protocol: "http" };
    const res = createResponse();
    mocks.service.createTeamInvite.mockRejectedValueOnce(new Error("boom"));
    await createTeamInviteHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });

  it("listInviteEligibleStudents validates team id", async () => {
    const res = createResponse();
    await listInviteEligibleStudentsHandler({ user: { sub: 4 }, params: { teamId: "x" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("listInviteEligibleStudents requires authenticated staff actor", async () => {
    const res = createResponse();
    await listInviteEligibleStudentsHandler({ params: { teamId: "2" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it.each([
    ["TEAM_NOT_FOUND_OR_INACTIVE", 404],
    ["TEAM_ACCESS_FORBIDDEN", 403],
  ])("listInviteEligibleStudents maps service error %s", async (code, status) => {
    const req = { user: { sub: 4 }, params: { teamId: "2" } };
    const res = createResponse();
    mocks.service.listInviteEligibleStudents.mockRejectedValueOnce({ code });
    await listInviteEligibleStudentsHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(status);
  });

  it("listInviteEligibleStudents returns students on success", async () => {
    const req = { user: { sub: 4 }, params: { teamId: "2" } };
    const res = createResponse();
    await listInviteEligibleStudentsHandler(req as any, res);
    expect(res.json).toHaveBeenCalledWith([{ id: 2 }]);
  });

  it("listInviteEligibleStudents maps unexpected service errors to 500", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const req = { user: { sub: 4 }, params: { teamId: "2" } };
    const res = createResponse();
    mocks.service.listInviteEligibleStudents.mockRejectedValueOnce(new Error("boom"));
    await listInviteEligibleStudentsHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });

  it("listTeamInvites validates team id", async () => {
    const res = createResponse();
    await listTeamInvitesHandler({ user: { sub: 4 }, params: { teamId: "x" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("listTeamInvites requires authenticated staff actor", async () => {
    const res = createResponse();
    await listTeamInvitesHandler({ params: { teamId: "2" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it.each([
    ["TEAM_NOT_FOUND_OR_INACTIVE", 404],
    ["TEAM_ACCESS_FORBIDDEN", 403],
  ])("listTeamInvites maps service error %s", async (code, status) => {
    const req = { user: { sub: 4 }, params: { teamId: "2" } };
    const res = createResponse();
    mocks.service.listTeamInvites.mockRejectedValueOnce({ code });
    await listTeamInvitesHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(status);
  });

  it("listTeamInvites returns invites on success", async () => {
    const req = { user: { sub: 4 }, params: { teamId: "2" } };
    const res = createResponse();
    await listTeamInvitesHandler(req as any, res);
    expect(res.json).toHaveBeenCalledWith([{ id: "inv-1" }]);
  });

  it("listTeamInvites maps unexpected service errors to 500", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const req = { user: { sub: 4 }, params: { teamId: "2" } };
    const res = createResponse();
    mocks.service.listTeamInvites.mockRejectedValueOnce(new Error("boom"));
    await listTeamInvitesHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });

  it("listReceivedInvites validates auth and service errors", async () => {
    const unauth = createResponse();
    await listReceivedInvitesHandler({ user: undefined } as any, unauth);
    expect(unauth.status).toHaveBeenCalledWith(401);

    const notFound = createResponse();
    mocks.service.listReceivedInvites.mockRejectedValueOnce({ code: "USER_NOT_FOUND" });
    await listReceivedInvitesHandler({ user: { sub: 4 } } as any, notFound);
    expect(notFound.status).toHaveBeenCalledWith(404);
  });

  it("listReceivedInvites returns invites on success", async () => {
    const res = createResponse();
    await listReceivedInvitesHandler({ user: { sub: 4 } } as any, res);
    expect(res.json).toHaveBeenCalledWith([{ id: "inv-2" }]);
  });

  it("listReceivedInvites maps unexpected service errors to 500", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = createResponse();
    mocks.service.listReceivedInvites.mockRejectedValueOnce(new Error("boom"));
    await listReceivedInvitesHandler({ user: { sub: 4 } } as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });

  it("acceptTeamInvite validates params/auth and returns invite on success", async () => {
    const invalid = createResponse();
    await acceptTeamInviteHandler({ params: { inviteId: " " }, user: { sub: 4 } } as any, invalid);
    expect(invalid.status).toHaveBeenCalledWith(400);

    const unauth = createResponse();
    await acceptTeamInviteHandler({ params: { inviteId: "inv-1" }, user: undefined } as any, unauth);
    expect(unauth.status).toHaveBeenCalledWith(401);

    mocks.service.acceptTeamInvite.mockResolvedValueOnce({ id: "inv-1" });
    const ok = createResponse();
    await acceptTeamInviteHandler({ params: { inviteId: "inv-1" }, user: { sub: 4 } } as any, ok);
    expect(ok.json).toHaveBeenCalledWith({ ok: true, invite: { id: "inv-1" } });
  });

  it.each([
    ["INVITE_NOT_PENDING", 409],
    ["TEAM_NOT_FOUND", 409],
  ])("acceptTeamInvite maps service error %s", async (code, status) => {
    const res = createResponse();
    mocks.service.acceptTeamInvite.mockRejectedValueOnce({ code });
    await acceptTeamInviteHandler({ params: { inviteId: "inv-1" }, user: { sub: 4 } } as any, res);
    expect(res.status).toHaveBeenCalledWith(status);
  });

  it("acceptTeamInvite maps unexpected service errors to 500", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = createResponse();
    mocks.service.acceptTeamInvite.mockRejectedValueOnce(new Error("boom"));
    await acceptTeamInviteHandler({ params: { inviteId: "inv-1" }, user: { sub: 4 } } as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });

  it("decline transition maps pending and unexpected states", async () => {
    const conflict = createResponse();
    mocks.service.declineTeamInvite.mockRejectedValueOnce({ code: "INVITE_NOT_PENDING" });
    await declineTeamInviteHandler({ params: { inviteId: "inv-1" } } as any, conflict);
    expect(conflict.status).toHaveBeenCalledWith(409);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failed = createResponse();
    mocks.service.declineTeamInvite.mockRejectedValueOnce(new Error("boom"));
    await declineTeamInviteHandler({ params: { inviteId: "inv-1" } } as any, failed);
    expect(failed.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });

  it.each([
    [rejectTeamInviteHandler, "rejectTeamInvite", "rejectTeamInvite"],
    [cancelTeamInviteHandler, "cancelTeamInvite", "cancelTeamInvite"],
    [expireTeamInviteHandler, "expireTeamInvite", "expireTeamInvite"],
  ])("executes %s transition wrapper", async (handler: any, serviceName: string, _label: string) => {
    (mocks.service as any)[serviceName].mockResolvedValueOnce({ id: "inv-z" });
    const res = createResponse();
    await handler({ params: { inviteId: "inv-z" } } as any, res);
    expect(res.json).toHaveBeenCalledWith({ ok: true, invite: { id: "inv-z" } });
  });

  it("transition wrappers return 400 for invalid invite ids", async () => {
    const res = createResponse();
    await rejectTeamInviteHandler({ params: { inviteId: " " } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
