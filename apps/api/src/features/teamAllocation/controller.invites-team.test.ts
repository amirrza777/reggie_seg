import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import {
  createTeamInviteHandler,
  listInviteEligibleStudentsHandler,
  listTeamInvitesHandler,
} from "./controller.invites.js";
import { createTeamForProjectHandler, getTeamByIdHandler } from "./controller.teams.js";

vi.mock("./service.js", () => ({
  createTeamInvite: vi.fn(),
  listInviteEligibleStudents: vi.fn(),
  listTeamInvites: vi.fn(),
  createTeamForProject: vi.fn(),
  getTeamById: vi.fn(),
}));

function createResponse() {
  const res: Partial<Response> = { status: vi.fn(), json: vi.fn() };
  (res.status as any).mockReturnValue(res);
  (res.json as any).mockReturnValue(res);
  return res as Response;
}

describe("controller invites and teams", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires auth for creating invite", async () => {
    const res = createResponse();
    await createTeamInviteHandler({ user: undefined, body: { teamId: 1, inviteeEmail: "a@b.com" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns invite id on invite creation", async () => {
    (service.createTeamInvite as any).mockResolvedValue({ invite: { id: "inv-1" } });
    const req: any = { user: { sub: 4 }, body: { teamId: 2, inviteeEmail: "a@b.com" }, headers: {}, get: vi.fn(), protocol: "http" };
    const res = createResponse();
    await createTeamInviteHandler(req, res);
    expect(service.createTeamInvite).toHaveBeenCalledWith(expect.objectContaining({ teamId: 2, inviterId: 4 }));
    expect(res.json).toHaveBeenCalledWith({ ok: true, inviteId: "inv-1" });
  });

  it("rejects invalid team id on listTeamInvites", async () => {
    const res = createResponse();
    await listTeamInvitesHandler({ user: { sub: 4 }, params: { teamId: "x" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("requires valid team id on listInviteEligibleStudents", async () => {
    const res = createResponse();
    await listInviteEligibleStudentsHandler({ user: { sub: 4 }, params: { teamId: "x" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("creates team for project", async () => {
    (service.createTeamForProject as any).mockResolvedValue({ id: 11, teamName: "Blue" });
    const req: any = { user: { sub: 2 }, body: { projectId: 8, teamName: "Blue" } };
    const res = createResponse();
    await createTeamForProjectHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("maps team-not-found to 404", async () => {
    (service.getTeamById as any).mockRejectedValue({ code: "TEAM_NOT_FOUND" });
    const res = createResponse();
    await getTeamByIdHandler({ params: { teamId: "3" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
