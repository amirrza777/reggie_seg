import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    user: { findUnique: vi.fn() },
    project: { findFirst: vi.fn() },
    teamAllocation: { findFirst: vi.fn() },
  },
  TeamService: {
    createTeam: vi.fn(),
    getTeamById: vi.fn(),
    addUserToTeam: vi.fn(),
    getTeamMembers: vi.fn(),
  },
}));

vi.mock("../../../shared/db.js", () => ({ prisma: mocks.prisma }));
vi.mock("../repo/repo.js", () => ({ TeamService: mocks.TeamService }));

import {
  addUserToTeam,
  createTeam,
  createTeamForProject,
  getTeamById,
  getTeamMembers,
} from "./service.team.js";

describe("service.team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.user.findUnique.mockResolvedValue({ enterpriseId: "ent-1", role: "STUDENT", active: true });
    mocks.prisma.project.findFirst.mockResolvedValue({ id: 2, module: { enterpriseId: "ent-1" } });
    mocks.prisma.teamAllocation.findFirst.mockResolvedValue(null);
    mocks.TeamService.createTeam.mockResolvedValue({ id: 10, teamName: "Blue" });
    mocks.TeamService.getTeamById.mockResolvedValue({ id: 10 });
    mocks.TeamService.addUserToTeam.mockResolvedValue({ teamId: 10, userId: 4 });
    mocks.TeamService.getTeamMembers.mockResolvedValue([{ id: 4 }]);
  });

  it("rejects invalid project id in createTeam", async () => {
    await expect(createTeam(4, { projectId: "x", teamName: "Team A" } as any)).rejects.toMatchObject({
      code: "INVALID_PROJECT_ID",
    });
  });

  it("rejects empty team names", async () => {
    await expect(createTeam(4, { projectId: 2, teamName: "   " } as any)).rejects.toMatchObject({ code: "INVALID_TEAM_NAME" });
    await expect(createTeam(4, { projectId: 2, teamName: 123 } as any)).rejects.toMatchObject({ code: "INVALID_TEAM_NAME" });
    await expect(createTeamForProject(4, 2, " ")).rejects.toMatchObject({ code: "INVALID_TEAM_NAME" });
  });

  it("rejects when user is missing or inactive", async () => {
    mocks.prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(createTeam(4, { projectId: 2, teamName: "Team" } as any)).rejects.toEqual({ code: "USER_NOT_FOUND" });

    mocks.prisma.user.findUnique.mockResolvedValueOnce({ enterpriseId: "ent-1", role: "STUDENT", active: false });
    await expect(createTeamForProject(4, 2, "Team")).rejects.toEqual({ code: "USER_NOT_FOUND" });
  });

  it("rejects when user is not a student", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ enterpriseId: "ent-1", role: "STAFF", active: true });
    await expect(createTeamForProject(4, 2, "Team")).rejects.toEqual({ code: "TEAM_CREATION_FORBIDDEN" });
  });

  it("rejects when project is inaccessible", async () => {
    mocks.prisma.project.findFirst.mockResolvedValue(null);
    await expect(createTeamForProject(4, 2, "Team")).rejects.toEqual({ code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" });
  });

  it("rejects when student already has an active team", async () => {
    mocks.prisma.teamAllocation.findFirst.mockResolvedValue({ teamId: 1 });
    await expect(createTeamForProject(4, 2, "Team")).rejects.toEqual({ code: "STUDENT_ALREADY_IN_TEAM" });
  });

  it("maps duplicate-name database errors to TEAM_NAME_ALREADY_EXISTS", async () => {
    mocks.TeamService.createTeam.mockRejectedValue({ code: "P2002" });
    await expect(createTeamForProject(4, 2, "Team")).rejects.toEqual({ code: "TEAM_NAME_ALREADY_EXISTS" });
  });

  it("rethrows unknown errors from TeamService.createTeam", async () => {
    const error = new Error("boom");
    mocks.TeamService.createTeam.mockRejectedValue(error);
    await expect(createTeamForProject(4, 2, "Team")).rejects.toBe(error);
  });

  it("creates student teams with normalized team names", async () => {
    const created = await createTeam(4, { projectId: 2, teamName: " Blue " } as any);
    expect(created).toEqual({ id: 10, teamName: "Blue" });
    expect(mocks.TeamService.createTeam).toHaveBeenCalledWith(
      4,
      expect.objectContaining({ enterpriseId: "ent-1", projectId: 2, teamName: "Blue", allocationLifecycle: "ACTIVE" }),
    );
  });

  it("creates student teams for explicit projects", async () => {
    await createTeamForProject(4, 2, "Blue");
    expect(mocks.TeamService.createTeam).toHaveBeenCalledWith(
      4,
      expect.objectContaining({ enterpriseId: "ent-1", projectId: 2, teamName: "Blue" }),
    );
  });

  it("delegates team read/write helpers to TeamService", async () => {
    await expect(getTeamById(10)).resolves.toEqual({ id: 10 });
    await expect(addUserToTeam(10, 4, "OWNER")).resolves.toEqual({ teamId: 10, userId: 4 });
    await expect(getTeamMembers(10)).resolves.toEqual([{ id: 4 }]);
  });
});
