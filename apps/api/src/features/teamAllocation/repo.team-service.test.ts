import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTeamAllocation,
  createTeamRecord,
  createTeamWithOwner,
  findTeamAllocation,
  findTeamById,
  listTeamMemberUsers,
} from "./repo.js";
import * as repo from "./repo.js";
import { createTeam, getTeamById, addUserToTeam, getTeamMembers } from "./team.service.js";

vi.mock("./repo.js", async () => {
  const actual = await vi.importActual<typeof import("./repo.js")>("./repo.js");
  return {
    ...actual,
    createTeamWithOwner: vi.fn(),
    createTeamRecord: vi.fn(),
    findTeamById: vi.fn(),
    findTeamAllocation: vi.fn(),
    createTeamAllocation: vi.fn(),
    findUserEnterpriseById: vi.fn(),
    listTeamMemberUsers: vi.fn(),
  };
});

describe("teamAllocation repo team service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createTeam delegates to createTeamWithOwner", async () => {
    (repo.createTeamWithOwner as any).mockResolvedValue({ id: 77, teamName: "Delta" });

    const team = await createTeam(5, { teamName: "Delta", projectId: 3 } as any);

    expect(repo.createTeamWithOwner).toHaveBeenCalledWith(5, { teamName: "Delta", projectId: 3 });
    expect(team).toEqual({ id: 77, teamName: "Delta" });
  });

  it("getTeamById throws TEAM_NOT_FOUND for missing team", async () => {
    (repo.findTeamById as any).mockResolvedValue(null);

    await expect(getTeamById(44)).rejects.toEqual({ code: "TEAM_NOT_FOUND" });
  });

  it("addUserToTeam validates team and duplicate membership", async () => {
    (repo.findTeamById as any).mockResolvedValueOnce(null);
    await expect(addUserToTeam(1, 2)).rejects.toEqual({ code: "TEAM_NOT_FOUND" });

    (repo.findTeamById as any).mockResolvedValueOnce({ id: 1 });
    (repo.findTeamAllocation as any).mockResolvedValueOnce({ teamId: 1, userId: 2 });
    await expect(addUserToTeam(1, 2)).rejects.toEqual({ code: "MEMBER_ALREADY_EXISTS" });

    (repo.findTeamById as any).mockResolvedValueOnce({ id: 1 });
    (repo.findTeamAllocation as any).mockResolvedValueOnce(null);
    (repo.createTeamAllocation as any).mockResolvedValueOnce({ teamId: 1, userId: 2 });
    await expect(addUserToTeam(1, 2)).resolves.toEqual({ teamId: 1, userId: 2 });
  });

  it("getTeamMembers returns repo member list", async () => {
    (repo.findTeamById as any).mockResolvedValue({ id: 3 });
    (repo.listTeamMemberUsers as any).mockResolvedValue([
      { id: 1, email: "a@test.com" },
      { id: 2, email: "b@test.com" },
    ]);

    const result = await getTeamMembers(3);

    expect(result).toEqual([
      { id: 1, email: "a@test.com" },
      { id: 2, email: "b@test.com" },
    ]);
  });
});
