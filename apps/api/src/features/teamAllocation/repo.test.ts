import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTeamInviteRecord,
  findModuleStudents,
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
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("teamAllocation repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findActiveInvite queries active pending invite by team and email", async () => {
    await findActiveInvite(2, "user@example.com");

    expect(prisma.teamInvite.findFirst).toHaveBeenCalledWith({
      where: {
        teamId: 2,
        inviteeEmail: "user@example.com",
        active: true,
        status: "PENDING",
      },
    });
  });

  it("createTeamInviteRecord creates pending active invite", async () => {
    const expiresAt = new Date("2026-03-07T12:00:00.000Z");

    await createTeamInviteRecord({
      teamId: 4,
      inviterId: 9,
      inviteeId: 11,
      inviteeEmail: "user@example.com",
      tokenHash: "hash",
      expiresAt,
      message: "Hello",
    });

    expect(prisma.teamInvite.create).toHaveBeenCalledWith({
      data: {
        teamId: 4,
        inviterId: 9,
        inviteeId: 11,
        inviteeEmail: "user@example.com",
        tokenHash: "hash",
        expiresAt,
        status: "PENDING",
        active: true,
        message: "Hello",
      },
    });
  });

  it("findInviteContext fetches team and inviter", async () => {
    await findInviteContext(5, 8);

    expect(prisma.team.findUnique).toHaveBeenCalledWith({
      where: { id: 5 },
      select: { teamName: true },
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 8 },
      select: { firstName: true, lastName: true, email: true },
    });
  });

  it("getInvitesForTeam returns ordered invites", async () => {
    await getInvitesForTeam(12);

    expect(prisma.teamInvite.findMany).toHaveBeenCalledWith({
      where: { teamId: 12 },
      orderBy: { createdAt: "desc" },
      include: {
        inviter: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  });

  it("findStaffScopedProject returns null when user is missing/inactive/student", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);
    await expect(findStaffScopedProject(9, 3)).resolves.toBeNull();

    (prisma.user.findUnique as any).mockResolvedValueOnce({
      enterpriseId: "ent-1",
      role: "STAFF",
      active: false,
    });
    await expect(findStaffScopedProject(9, 3)).resolves.toBeNull();

    (prisma.user.findUnique as any).mockResolvedValueOnce({
      enterpriseId: "ent-1",
      role: "STUDENT",
      active: true,
    });
    await expect(findStaffScopedProject(9, 3)).resolves.toBeNull();
  });

  it("findStaffScopedProject enforces scoped access for staff roles", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      enterpriseId: "ent-1",
      role: "STAFF",
      active: true,
    });
    (prisma.project.findFirst as any).mockResolvedValueOnce({
      id: 4,
      name: "Project A",
      moduleId: 7,
      archivedAt: null,
      module: { name: "Module A" },
    });

    await expect(findStaffScopedProject(12, 4)).resolves.toEqual({
      id: 4,
      name: "Project A",
      moduleId: 7,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-1",
    });

    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: {
        id: 4,
        module: {
          enterpriseId: "ent-1",
          OR: [
            { moduleLeads: { some: { userId: 12 } } },
            { moduleTeachingAssistants: { some: { userId: 12 } } },
          ],
        },
      },
      select: {
        id: true,
        name: true,
        moduleId: true,
        archivedAt: true,
        module: {
          select: { name: true },
        },
      },
    });
  });

  it("findStaffScopedProject allows admin enterprise-wide scope", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      enterpriseId: "ent-2",
      role: "ADMIN",
      active: true,
    });
    (prisma.project.findFirst as any).mockResolvedValueOnce(null);

    await findStaffScopedProject(1, 99);

    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: {
        id: 99,
        module: {
          enterpriseId: "ent-2",
        },
      },
      select: {
        id: true,
        name: true,
        moduleId: true,
        archivedAt: true,
        module: {
          select: { name: true },
        },
      },
    });
  });

  it("findModuleStudents returns active students in module", async () => {
    (prisma.user.findMany as any).mockResolvedValueOnce([{ id: 1 }]);

    await findModuleStudents("ent-3", 22);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        enterpriseId: "ent-3",
        active: true,
        role: "STUDENT",
        userModules: {
          some: {
            enterpriseId: "ent-3",
            moduleId: 22,
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
    });
  });

  it("findProjectTeamSummaries maps member counts", async () => {
    (prisma.team.findMany as any).mockResolvedValueOnce([
      { id: 2, teamName: "A", _count: { allocations: 3 } },
      { id: 4, teamName: "B", _count: { allocations: 5 } },
    ]);

    await expect(findProjectTeamSummaries(10)).resolves.toEqual([
      { id: 2, teamName: "A", memberCount: 3 },
      { id: 4, teamName: "B", memberCount: 5 },
    ]);
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