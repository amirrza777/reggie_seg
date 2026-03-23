import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import {
  acceptTeamInviteHandler,
  cancelTeamInviteHandler,
  declineTeamInviteHandler,
  expireTeamInviteHandler,
  rejectTeamInviteHandler,
} from "./controller.invites.js";

vi.mock("./service.js", () => ({
  acceptTeamInvite: vi.fn(),
  cancelTeamInvite: vi.fn(),
  declineTeamInvite: vi.fn(),
  expireTeamInvite: vi.fn(),
  rejectTeamInvite: vi.fn(),
}));

function createResponse() {
  const res: Partial<Response> = { status: vi.fn(), json: vi.fn() };
  (res.status as any).mockReturnValue(res);
  (res.json as any).mockReturnValue(res);
  return res as Response;
}

describe("controller invite transitions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("validates invite id and auth for accept", async () => {
    const missingInviteRes = createResponse();
    await acceptTeamInviteHandler({ params: { inviteId: " " }, user: { sub: 2 } } as any, missingInviteRes);
    expect(missingInviteRes.status).toHaveBeenCalledWith(400);

    const missingAuthRes = createResponse();
    await acceptTeamInviteHandler({ params: { inviteId: "inv-1" }, user: undefined } as any, missingAuthRes);
    expect(missingAuthRes.status).toHaveBeenCalledWith(401);
  });

  it("returns ok for successful accept", async () => {
    (service.acceptTeamInvite as any).mockResolvedValue({ id: "inv-1", status: "ACCEPTED" });
    const res = createResponse();
    await acceptTeamInviteHandler({ params: { inviteId: "inv-1" }, user: { sub: 2 } } as any, res);
    expect(service.acceptTeamInvite).toHaveBeenCalledWith("inv-1", 2);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it.each([
    [declineTeamInviteHandler, "declineTeamInvite"],
    [rejectTeamInviteHandler, "rejectTeamInvite"],
    [cancelTeamInviteHandler, "cancelTeamInvite"],
    [expireTeamInviteHandler, "expireTeamInvite"],
  ])("%s maps invite-not-pending to 409", async (handler: any, serviceName: string) => {
    (service as any)[serviceName].mockRejectedValue({ code: "INVITE_NOT_PENDING" });
    const res = createResponse();
    await handler({ params: { inviteId: "inv-1" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});