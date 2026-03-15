import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyManualAllocationTeam,
  applyRandomAllocationPlan,
  createTeamInviteRecord,
  findModuleStudentsForManualAllocation,
  findVacantModuleStudentsForProject,
  findProjectTeamSummaries,
  findStaffScopedProject,
  findActiveInvite,
  findInviteContext,
  getInvitesForTeam,
  TeamService,
  updateInviteStatusFromPending,
} from "./repo.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    teamInvite: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    teamAllocation: {
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("teamAllocation repo team service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("updateInviteStatusFromPending returns null when no rows updated", async () => {
    (prisma.teamInvite.updateMany as any).mockResolvedValue({ count: 0 });

    await expect(updateInviteStatusFromPending("inv-1", "ACCEPTED", new Date())).resolves.toBeNull();
  });

  it("updateInviteStatusFromPending returns updated invite when status changes", async () => {
    (prisma.teamInvite.updateMany as any).mockResolvedValue({ count: 1 });
    (prisma.teamInvite.findUnique as any).mockResolvedValue({ id: "inv-1", status: "ACCEPTED" });

    await expect(updateInviteStatusFromPending("inv-1", "ACCEPTED", new Date())).resolves.toEqual({
      id: "inv-1",
      status: "ACCEPTED",
    });
    expect(prisma.teamInvite.findUnique).toHaveBeenCalledWith({ where: { id: "inv-1" } });
  });

  it("TeamService.createTeam creates team and allocation in transaction", async () => {
    const tx = {
      team: { create: vi.fn().mockResolvedValue({ id: 77, teamName: "Delta" }) },
      teamAllocation: { create: vi.fn().mockResolvedValue({ teamId: 77, userId: 5 }) },
    };
    (prisma.$transaction as any).mockImplementation(async (cb: any) => cb(tx));

    const team = await TeamService.createTeam(5, { teamName: "Delta", projectId: 3 } as any);

    expect(tx.team.create).toHaveBeenCalledWith({ data: { teamName: "Delta", projectId: 3 } });
    expect(tx.teamAllocation.create).toHaveBeenCalledWith({ data: { teamId: 77, userId: 5 } });
    expect(team).toEqual({ id: 77, teamName: "Delta" });
  });

  it("TeamService.getTeamById throws TEAM_NOT_FOUND for missing team", async () => {
    (prisma.team.findUnique as any).mockResolvedValue(null);

    await expect(TeamService.getTeamById(44)).rejects.toEqual({ code: "TEAM_NOT_FOUND" });
  });

  it("TeamService.addUserToTeam validates team and duplicate membership", async () => {
    (prisma.team.findUnique as any).mockResolvedValueOnce(null);
    await expect(TeamService.addUserToTeam(1, 2)).rejects.toEqual({ code: "TEAM_NOT_FOUND" });

    (prisma.team.findUnique as any).mockResolvedValueOnce({ id: 1 });
    (prisma.teamAllocation.findUnique as any).mockResolvedValueOnce({ teamId: 1, userId: 2 });
    await expect(TeamService.addUserToTeam(1, 2)).rejects.toEqual({ code: "MEMBER_ALREADY_EXISTS" });

    (prisma.team.findUnique as any).mockResolvedValueOnce({ id: 1 });
    (prisma.teamAllocation.findUnique as any).mockResolvedValueOnce(null);
    (prisma.teamAllocation.create as any).mockResolvedValueOnce({ teamId: 1, userId: 2 });
    await expect(TeamService.addUserToTeam(1, 2)).resolves.toEqual({ teamId: 1, userId: 2 });
  });

  it("TeamService.getTeamMembers returns mapped user list", async () => {
    (prisma.team.findUnique as any).mockResolvedValue({ id: 3 });
    (prisma.teamAllocation.findMany as any).mockResolvedValue([
      { user: { id: 1, email: "a@test.com" } },
      { user: { id: 2, email: "b@test.com" } },
    ]);

    const result = await TeamService.getTeamMembers(3);

    expect(result).toEqual([
      { id: 1, email: "a@test.com" },
      { id: 2, email: "b@test.com" },
    ]);
  });
});
