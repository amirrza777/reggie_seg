import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addUserToTeam,
  createTeam,
  createTeamForProject,
  getTeamById,
  getTeamMembers,
} from "./team.service.js";
import * as repo from "./repo.js";

vi.mock("./repo.js", () => ({
  createTeamWithOwner: vi.fn(),
  createTeamAllocation: vi.fn(),
  findTeamAllocation: vi.fn(),
  findTeamById: vi.fn(),
  findUserEnterpriseById: vi.fn(),
  listTeamMemberUsers: vi.fn(),
}));

const repoMock = vi.mocked(repo);

describe("team.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates createTeam directly to the repo helper", async () => {
    repoMock.createTeamWithOwner.mockResolvedValue({ id: 90 } as any);
    await createTeam(7, { projectId: 4, teamName: "Alpha" } as any);
    expect(repoMock.createTeamWithOwner).toHaveBeenCalledWith(7, { projectId: 4, teamName: "Alpha" });
  });

  it("rejects createTeamForProject when user is missing", async () => {
    repoMock.findUserEnterpriseById.mockResolvedValue(null as any);
    await expect(createTeamForProject(7, 4, "Alpha")).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });

  it("builds enterprise scoped payload in createTeamForProject", async () => {
    repoMock.findUserEnterpriseById.mockResolvedValue({ enterpriseId: "ent-1" } as any);
    repoMock.createTeamWithOwner.mockResolvedValue({ id: 91 } as any);
    await createTeamForProject(7, 4, "Alpha");
    expect(repoMock.createTeamWithOwner).toHaveBeenCalledWith(7, { enterpriseId: "ent-1", projectId: 4, teamName: "Alpha" });
  });

  it("forwards read/write helpers to the repo layer", async () => {
    repoMock.findTeamById.mockResolvedValue({ id: 8 } as any);
    repoMock.findTeamAllocation.mockResolvedValue(null as any);
    repoMock.createTeamAllocation.mockResolvedValue({ teamId: 1, userId: 2 } as any);
    repoMock.listTeamMemberUsers.mockResolvedValue([{ id: 2 }] as any);

    await addUserToTeam(1, 2, "OWNER");
    await getTeamById(8);
    await getTeamMembers(8);

    expect(repoMock.createTeamAllocation).toHaveBeenCalledWith(1, 2);
    expect(repoMock.findTeamById).toHaveBeenCalledWith(8);
    expect(repoMock.listTeamMemberUsers).toHaveBeenCalledWith(8);
  });
});
