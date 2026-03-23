import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addUserToTeam,
  createTeam,
  createTeamForProject,
  getTeamById,
  getTeamMembers,
} from "./team.service.js";
import { TeamService } from "./repo.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db.js", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

vi.mock("./repo.js", () => ({
  TeamService: {
    createTeam: vi.fn(),
    addUserToTeam: vi.fn(),
    getTeamById: vi.fn(),
    getTeamMembers: vi.fn(),
  },
}));

const teamServiceMock = vi.mocked(TeamService);
const prismaMock = vi.mocked(prisma);

describe("team.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates createTeam directly to TeamService", async () => {
    teamServiceMock.createTeam.mockResolvedValue({ id: 90 } as any);
    await createTeam(7, { projectId: 4, teamName: "Alpha" } as any);
    expect(teamServiceMock.createTeam).toHaveBeenCalledWith(7, { projectId: 4, teamName: "Alpha" });
  });

  it("rejects createTeamForProject when user is missing", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null as any);
    await expect(createTeamForProject(7, 4, "Alpha")).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });

  it("builds enterprise scoped payload in createTeamForProject", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ enterpriseId: "ent-1" } as any);
    teamServiceMock.createTeam.mockResolvedValue({ id: 91 } as any);
    await createTeamForProject(7, 4, "Alpha");
    expect(teamServiceMock.createTeam).toHaveBeenCalledWith(7, { enterpriseId: "ent-1", projectId: 4, teamName: "Alpha" });
  });

  it("forwards read/write helpers to TeamService", async () => {
    await addUserToTeam(1, 2, "OWNER");
    await getTeamById(8);
    await getTeamMembers(8);
    expect(teamServiceMock.addUserToTeam).toHaveBeenCalledWith(1, 2, "OWNER");
    expect(teamServiceMock.getTeamById).toHaveBeenCalledWith(8);
    expect(teamServiceMock.getTeamMembers).toHaveBeenCalledWith(8);
  });
});