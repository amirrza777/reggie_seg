import { describe, expect, it, vi } from "vitest";
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
  return res;
}

describe("controller.teams", () => {
  it("requires auth for createTeam", async () => {
    const res = createResponse();
    await createTeamHandler({ body: { teamData: { projectId: 7, teamName: "A" } } } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 for createTeamForProject invalid body", async () => {
    const req = { user: { sub: 4 }, body: { projectId: "x", teamName: "" } };
    const res = createResponse();
    await createTeamForProjectHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 for invalid team id in getTeamById", async () => {
    const res = createResponse();
    await getTeamByIdHandler({ params: { teamId: "nope" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid team ID" });
  });

  it("returns 400 for invalid addUserToTeam payload", async () => {
    const req = { params: { teamId: "12" }, body: { userId: "bad" } };
    const res = createResponse();
    await addUserToTeamHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 for invalid team id in getTeamMembers", async () => {
    const res = createResponse();
    await getTeamMembersHandler({ params: { teamId: "bad" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});