import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTeamInvite: vi.fn(),
  listTeamInvites: vi.fn(),
  listReceivedInvites: vi.fn(),
  acceptTeamInvite: vi.fn(),
  declineTeamInvite: vi.fn(),
  rejectTeamInvite: vi.fn(),
  cancelTeamInvite: vi.fn(),
  expireTeamInvite: vi.fn(),
}));

vi.mock("./service.js", () => ({
  createTeamInvite: mocks.createTeamInvite,
  listTeamInvites: mocks.listTeamInvites,
  listReceivedInvites: mocks.listReceivedInvites,
  acceptTeamInvite: mocks.acceptTeamInvite,
  declineTeamInvite: mocks.declineTeamInvite,
  rejectTeamInvite: mocks.rejectTeamInvite,
  cancelTeamInvite: mocks.cancelTeamInvite,
  expireTeamInvite: mocks.expireTeamInvite,
}));

import {
  acceptTeamInviteHandler,
  cancelTeamInviteHandler,
  createTeamInviteHandler,
  declineTeamInviteHandler,
  expireTeamInviteHandler,
  listReceivedInvitesHandler,
  listTeamInvitesHandler,
  rejectTeamInviteHandler,
} from "./invites.controller.js";

function createRes() {
  const res = { status: vi.fn(), json: vi.fn() } as any;
  res.status.mockReturnValue(res);
  return res;
}

describe("teamAllocation invites.controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createTeamInviteHandler validates body", async () => {
    const res = createRes();
    await createTeamInviteHandler({ body: { teamId: "x" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid request body" });
  });

  it("createTeamInviteHandler builds baseUrl from origin and returns invite id", async () => {
    mocks.createTeamInvite.mockResolvedValue({ invite: { id: "invite-1" } });
    const res = createRes();
    const req = {
      body: {
        teamId: "7",
        inviterId: "8",
        inviteeEmail: "a@b.com",
        inviteeId: "9",
        message: "hello",
      },
      headers: { origin: "https://web.local" },
      protocol: "https",
      get: vi.fn(),
    };
    await createTeamInviteHandler(req as any, res);
    expect(mocks.createTeamInvite).toHaveBeenCalledWith({
      teamId: 7,
      inviterId: 8,
      inviteeEmail: "a@b.com",
      inviteeId: 9,
      message: "hello",
      baseUrl: "https://web.local",
    });
    expect(res.json).toHaveBeenCalledWith({ ok: true, inviteId: "invite-1" });
  });

  it("createTeamInviteHandler falls back to host and maps known errors", async () => {
    const resArchived = createRes();
    mocks.createTeamInvite.mockRejectedValueOnce({ code: "TEAM_ARCHIVED" });
    await createTeamInviteHandler(
      {
        body: { teamId: "7", inviterId: "8", inviteeEmail: "a@b.com" },
        headers: {},
        protocol: "https",
        get: vi.fn().mockReturnValue("api.local"),
      } as any,
      resArchived,
    );
    expect(mocks.createTeamInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "https://api.local",
      }),
    );
    expect(resArchived.status).toHaveBeenCalledWith(409);

    const resPending = createRes();
    mocks.createTeamInvite.mockRejectedValueOnce({ code: "INVITE_ALREADY_PENDING" });
    await createTeamInviteHandler(
      {
        body: { teamId: "7", inviterId: "8", inviteeEmail: "a@b.com" },
        headers: {},
        protocol: "https",
        get: vi.fn().mockReturnValue(undefined),
      } as any,
      resPending,
    );
    expect(mocks.createTeamInvite).toHaveBeenCalledWith(expect.objectContaining({ baseUrl: "" }));
    expect(resPending.status).toHaveBeenCalledWith(409);
  });

  it("createTeamInviteHandler maps unknown error to 500", async () => {
    mocks.createTeamInvite.mockRejectedValue(new Error("boom"));
    const res = createRes();
    await createTeamInviteHandler(
      {
        body: { teamId: "7", inviterId: "8", inviteeEmail: "a@b.com" },
        headers: {},
        protocol: "https",
        get: vi.fn(),
      } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("listTeamInvitesHandler validates teamId and returns invites", async () => {
    const badRes = createRes();
    await listTeamInvitesHandler({ params: { teamId: "x" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    mocks.listTeamInvites.mockResolvedValue([{ id: "inv-1" }]);
    const okRes = createRes();
    await listTeamInvitesHandler({ params: { teamId: "3" } } as any, okRes);
    expect(okRes.json).toHaveBeenCalledWith([{ id: "inv-1" }]);
  });

  it("listTeamInvitesHandler maps service errors to 500", async () => {
    mocks.listTeamInvites.mockRejectedValue(new Error("boom"));
    const res = createRes();
    await listTeamInvitesHandler({ params: { teamId: "3" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("listReceivedInvitesHandler enforces auth and maps errors", async () => {
    const unauthRes = createRes();
    await listReceivedInvitesHandler({ user: undefined } as any, unauthRes);
    expect(unauthRes.status).toHaveBeenCalledWith(401);

    mocks.listReceivedInvites.mockResolvedValue([{ id: "inv-1" }]);
    const okRes = createRes();
    await listReceivedInvitesHandler({ user: { sub: 9 } } as any, okRes);
    expect(okRes.json).toHaveBeenCalledWith([{ id: "inv-1" }]);

    mocks.listReceivedInvites.mockRejectedValue(new Error("boom"));
    const failRes = createRes();
    await listReceivedInvitesHandler({ user: { sub: 9 } } as any, failRes);
    expect(failRes.status).toHaveBeenCalledWith(500);
  });

  it("acceptTeamInviteHandler validates inviteId and auth", async () => {
    const badIdRes = createRes();
    await acceptTeamInviteHandler({ params: { inviteId: "" }, user: { sub: 7 } } as any, badIdRes);
    expect(badIdRes.status).toHaveBeenCalledWith(400);

    const nonStringIdRes = createRes();
    await acceptTeamInviteHandler({ params: { inviteId: 12 }, user: { sub: 7 } } as any, nonStringIdRes);
    expect(nonStringIdRes.status).toHaveBeenCalledWith(400);

    const unauthRes = createRes();
    await acceptTeamInviteHandler({ params: { inviteId: "inv-1" }, user: undefined } as any, unauthRes);
    expect(unauthRes.status).toHaveBeenCalledWith(401);
  });

  it("acceptTeamInviteHandler returns success and maps errors", async () => {
    mocks.acceptTeamInvite.mockResolvedValue({ id: "inv-1", status: "ACCEPTED" });
    const okRes = createRes();
    await acceptTeamInviteHandler({ params: { inviteId: "inv-1" }, user: { sub: 7 } } as any, okRes);
    expect(okRes.json).toHaveBeenCalledWith({
      ok: true,
      invite: { id: "inv-1", status: "ACCEPTED" },
    });

    mocks.acceptTeamInvite.mockRejectedValueOnce({ code: "INVITE_NOT_PENDING" });
    const conflictRes = createRes();
    await acceptTeamInviteHandler({ params: { inviteId: "inv-1" }, user: { sub: 7 } } as any, conflictRes);
    expect(conflictRes.status).toHaveBeenCalledWith(409);

    mocks.acceptTeamInvite.mockRejectedValueOnce(new Error("boom"));
    const failRes = createRes();
    await acceptTeamInviteHandler({ params: { inviteId: "inv-1" }, user: { sub: 7 } } as any, failRes);
    expect(failRes.status).toHaveBeenCalledWith(500);
  });

  it("decline/reject/cancel/expire handlers share transition behavior", async () => {
    const makeReq = (inviteId: string) => ({ params: { inviteId } }) as any;

    mocks.declineTeamInvite.mockResolvedValue({ id: "i1" });
    const declineRes = createRes();
    await declineTeamInviteHandler(makeReq("i1"), declineRes);
    expect(declineRes.json).toHaveBeenCalledWith({ ok: true, invite: { id: "i1" } });

    mocks.rejectTeamInvite.mockRejectedValueOnce({ code: "INVITE_NOT_PENDING" });
    const rejectRes = createRes();
    await rejectTeamInviteHandler(makeReq("i2"), rejectRes);
    expect(rejectRes.status).toHaveBeenCalledWith(409);

    mocks.cancelTeamInvite.mockRejectedValueOnce(new Error("boom"));
    const cancelRes = createRes();
    await cancelTeamInviteHandler(makeReq("i3"), cancelRes);
    expect(cancelRes.status).toHaveBeenCalledWith(500);

    const expireBadRes = createRes();
    await expireTeamInviteHandler(makeReq(""), expireBadRes);
    expect(expireBadRes.status).toHaveBeenCalledWith(400);

    const declineNonStringRes = createRes();
    await declineTeamInviteHandler({ params: { inviteId: 99 } } as any, declineNonStringRes);
    expect(declineNonStringRes.status).toHaveBeenCalledWith(400);
  });
});
