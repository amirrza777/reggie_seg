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
  applyCustomAllocationForProject: vi.fn(),
  getCustomAllocationCoverageForProject: vi.fn(),
  getManualAllocationWorkspaceForProject: vi.fn(),
  listCustomAllocationQuestionnairesForProject: vi.fn(),
  previewCustomAllocationForProject: vi.fn(),
  previewRandomAllocationForProject: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("teamAllocation controller invite transition handlers", () => {
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
