import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    team: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    teamAllocation: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock("../../../shared/db.js", () => ({ prisma: mocks.prisma }));

import { TeamService, applyManualAllocationTeam, applyRandomAllocationPlan } from "./repo.allocations.js";

describe("repo.allocations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (run: any) => run(mocks.prisma));
    mocks.prisma.teamAllocation.findMany.mockResolvedValue([]);
    mocks.prisma.team.findMany.mockResolvedValue([]);
    mocks.prisma.team.create.mockResolvedValue({ id: 10, teamName: "Random Team 1" });
  });

  it("applyRandomAllocationPlan rejects when students are no longer vacant", async () => {
    mocks.prisma.teamAllocation.findMany.mockResolvedValue([{ userId: 1 }]);
    await expect(
      applyRandomAllocationPlan(2, "ent-1", [{ members: [{ id: 1 }] }]),
    ).rejects.toEqual({ code: "STUDENTS_NO_LONGER_VACANT" });
  });

  it("applyRandomAllocationPlan validates team-name count and blank names", async () => {
    await expect(
      applyRandomAllocationPlan(2, "ent-1", [{ members: [] }, { members: [] }], { teamNames: ["Only one"] }),
    ).rejects.toEqual({ code: "INVALID_TEAM_NAMES" });
    await expect(
      applyRandomAllocationPlan(2, "ent-1", [{ members: [] }], { teamNames: ["  "] }),
    ).rejects.toEqual({ code: "INVALID_TEAM_NAMES" });
  });

  it("applyRandomAllocationPlan rejects duplicate names in enterprise", async () => {
    mocks.prisma.team.findMany.mockResolvedValue([{ teamName: "Blue" }]);
    await expect(
      applyRandomAllocationPlan(2, "ent-1", [{ members: [] }], { teamNames: ["Blue"] }),
    ).rejects.toEqual({ code: "TEAM_NAME_ALREADY_EXISTS" });
  });

  it("applyRandomAllocationPlan creates draft teams and allocations", async () => {
    mocks.prisma.team.create.mockResolvedValueOnce({ id: 21, teamName: "T1" }).mockResolvedValueOnce({ id: 22, teamName: "T2" });
    const result = await applyRandomAllocationPlan(
      2,
      "ent-1",
      [{ members: [{ id: 1 }, { id: 2 }] }, { members: [] }],
      { teamNames: ["T1", "T2"], draftCreatedById: 9 },
    );
    expect(result).toEqual([
      { id: 21, teamName: "T1", memberCount: 2 },
      { id: 22, teamName: "T2", memberCount: 0 },
    ]);
    expect(mocks.prisma.teamAllocation.createMany).toHaveBeenCalledTimes(1);
  });

  it("applyManualAllocationTeam rejects existing names and student conflicts", async () => {
    mocks.prisma.team.findFirst.mockResolvedValueOnce({ id: 1 });
    await expect(applyManualAllocationTeam(2, "ent-1", "Blue", [1])).rejects.toEqual({
      code: "TEAM_NAME_ALREADY_EXISTS",
    });
    mocks.prisma.team.findFirst.mockResolvedValueOnce(null);
    mocks.prisma.teamAllocation.findMany.mockResolvedValueOnce([{ userId: 1 }]);
    await expect(applyManualAllocationTeam(2, "ent-1", "Blue", [1])).rejects.toEqual({
      code: "STUDENTS_NO_LONGER_AVAILABLE",
    });
  });

  it("applyManualAllocationTeam creates a draft team and member allocations", async () => {
    mocks.prisma.team.findFirst.mockResolvedValue(null);
    mocks.prisma.teamAllocation.findMany.mockResolvedValue([]);
    mocks.prisma.team.create.mockResolvedValue({ id: 30, teamName: "Blue" });
    const result = await applyManualAllocationTeam(2, "ent-1", "Blue", [1, 2], { draftCreatedById: 7 });
    expect(result).toEqual({ id: 30, teamName: "Blue", memberCount: 2 });
    expect(mocks.prisma.teamAllocation.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: [{ teamId: 30, userId: 1 }, { teamId: 30, userId: 2 }], skipDuplicates: true }),
    );
  });

  it("TeamService.createTeam creates team and owner allocation", async () => {
    mocks.prisma.team.create.mockResolvedValue({ id: 40, teamName: "Alpha" });
    const team = await TeamService.createTeam(5, { enterpriseId: "ent-1", projectId: 2, teamName: "Alpha" } as any);
    expect(team).toEqual({ id: 40, teamName: "Alpha" });
    expect(mocks.prisma.teamAllocation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { teamId: 40, userId: 5 } }),
    );
  });

  it("TeamService.getTeamById returns team or TEAM_NOT_FOUND", async () => {
    mocks.prisma.team.findFirst.mockResolvedValueOnce({ id: 50 }).mockResolvedValueOnce(null);
    await expect(TeamService.getTeamById(50)).resolves.toEqual({ id: 50 });
    await expect(TeamService.getTeamById(51)).rejects.toEqual({ code: "TEAM_NOT_FOUND" });
  });

  it("TeamService.addUserToTeam validates team and member uniqueness", async () => {
    mocks.prisma.team.findFirst.mockResolvedValueOnce(null);
    await expect(TeamService.addUserToTeam(9, 2)).rejects.toEqual({ code: "TEAM_NOT_FOUND" });
    mocks.prisma.team.findFirst.mockResolvedValueOnce({ id: 9 });
    mocks.prisma.teamAllocation.findUnique.mockResolvedValueOnce({ teamId: 9, userId: 2 });
    await expect(TeamService.addUserToTeam(9, 2)).rejects.toEqual({ code: "MEMBER_ALREADY_EXISTS" });
    mocks.prisma.team.findFirst.mockResolvedValueOnce({ id: 9 });
    mocks.prisma.teamAllocation.findUnique.mockResolvedValueOnce(null);
    mocks.prisma.teamAllocation.create.mockResolvedValueOnce({ teamId: 9, userId: 3 });
    await expect(TeamService.addUserToTeam(9, 3)).resolves.toEqual({ teamId: 9, userId: 3 });
  });

  it("TeamService.getTeamMembers returns users or TEAM_NOT_FOUND", async () => {
    mocks.prisma.team.findFirst.mockResolvedValueOnce(null);
    await expect(TeamService.getTeamMembers(1)).rejects.toEqual({ code: "TEAM_NOT_FOUND" });
    mocks.prisma.team.findFirst.mockResolvedValueOnce({ id: 2 });
    mocks.prisma.teamAllocation.findMany.mockResolvedValueOnce([{ user: { id: 7 } }, { user: { id: 8 } }]);
    await expect(TeamService.getTeamMembers(2)).resolves.toEqual([{ id: 7 }, { id: 8 }]);
  });
});