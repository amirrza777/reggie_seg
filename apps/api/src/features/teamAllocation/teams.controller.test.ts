import { describe, expect, it, vi } from "vitest";
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
  it("validates createTeam request body", async () => {
    const res = createResponse();
    await createTeamHandler({ body: { userId: "", teamData: null } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid request body" });
  });

  it("validates createTeamForProject auth and inputs", async () => {
    const req = { body: { projectId: 7, teamName: "Team A" } };
    const res = createResponse();
    await createTeamForProjectHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 for invalid getTeamById param", async () => {
    const res = createResponse();
    await getTeamByIdHandler({ params: { teamId: "x" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 for invalid addUserToTeam body", async () => {
    const res = createResponse();
    await addUserToTeamHandler({ params: { teamId: "3" }, body: { userId: "x" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 for invalid getTeamMembers param", async () => {
    const res = createResponse();
    await getTeamMembersHandler({ params: { teamId: "x" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});