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
      select: { teamName: true, projectId: true },
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
        inviter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
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

  it("findVacantModuleStudentsForProject returns active unallocated students in module", async () => {
    (prisma.user.findMany as any).mockResolvedValueOnce([{ id: 1 }]);

    await findVacantModuleStudentsForProject("ent-3", 22, 5);

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
        teamAllocations: {
          none: {
            team: {
              projectId: 5,
              archivedAt: null,
            },
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

  it("findModuleStudentsForManualAllocation maps current project team status", async () => {
    (prisma.user.findMany as any).mockResolvedValueOnce([
      {
        id: 1,
        firstName: "A",
        lastName: "A",
        email: "a@example.com",
        teamAllocations: [{ team: { id: 10, teamName: "Team Alpha" } }],
      },
      {
        id: 2,
        firstName: "B",
        lastName: "B",
        email: "b@example.com",
        teamAllocations: [],
      },
    ]);

    await expect(findModuleStudentsForManualAllocation("ent-3", 22, 5)).resolves.toEqual([
      {
        id: 1,
        firstName: "A",
        lastName: "A",
        email: "a@example.com",
        currentTeamId: 10,
        currentTeamName: "Team Alpha",
      },
      {
        id: 2,
        firstName: "B",
        lastName: "B",
        email: "b@example.com",
        currentTeamId: null,
        currentTeamName: null,
      },
    ]);

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
        teamAllocations: {
          where: {
            team: {
              projectId: 5,
              archivedAt: null,
            },
          },
          select: {
            team: {
              select: {
                id: true,
                teamName: true,
              },
            },
          },
          orderBy: {
            teamId: "asc",
          },
          take: 1,
        },
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

  it("applyRandomAllocationPlan creates new teams and allocations", async () => {
    const tx = {
      team: {
        findMany: vi.fn().mockResolvedValue([{ teamName: "Team A" }]),
        create: vi.fn()
          .mockResolvedValueOnce({ id: 11, teamName: "Random Team 1" })
          .mockResolvedValueOnce({ id: 22, teamName: "Random Team 2" }),
      },
      teamAllocation: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    const result = await applyRandomAllocationPlan(5, "ent-1", [
      { members: [{ id: 1 }, { id: 2 }] },
      { members: [{ id: 3 }] },
    ]);

    expect(tx.teamAllocation.findMany).toHaveBeenCalledWith({
      where: {
        userId: { in: [1, 2, 3] },
        team: {
          projectId: 5,
          archivedAt: null,
        },
      },
      select: { userId: true },
    });
    expect(tx.team.findMany).toHaveBeenCalledWith({
      where: { enterpriseId: "ent-1" },
      select: { teamName: true },
    });
    expect(tx.team.create).toHaveBeenNthCalledWith(1, {
      data: {
        enterpriseId: "ent-1",
        projectId: 5,
        teamName: "Random Team 1",
      },
      select: { id: true, teamName: true },
    });
    expect(tx.team.create).toHaveBeenNthCalledWith(2, {
      data: {
        enterpriseId: "ent-1",
        projectId: 5,
        teamName: "Random Team 2",
      },
      select: { id: true, teamName: true },
    });
    expect(tx.teamAllocation.createMany).toHaveBeenNthCalledWith(1, {
      data: [
        { teamId: 11, userId: 1 },
        { teamId: 11, userId: 2 },
      ],
      skipDuplicates: true,
    });
    expect(tx.teamAllocation.createMany).toHaveBeenNthCalledWith(2, {
      data: [{ teamId: 22, userId: 3 }],
      skipDuplicates: true,
    });
    expect(result).toEqual([
      { id: 11, teamName: "Random Team 1", memberCount: 2 },
      { id: 22, teamName: "Random Team 2", memberCount: 1 },
    ]);
  });

  it("applyRandomAllocationPlan throws when one of the target team names already exists", async () => {
    const tx = {
      team: {
        findMany: vi.fn().mockResolvedValue([
          { teamName: "Random Team 1" },
        ]),
        create: vi.fn(),
      },
      teamAllocation: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn(),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    await expect(
      applyRandomAllocationPlan(5, "ent-1", [
        { members: [{ id: 1 }] },
        { members: [{ id: 2 }] },
      ]),
    ).rejects.toEqual({ code: "TEAM_NAME_ALREADY_EXISTS" });
    expect(tx.team.create).not.toHaveBeenCalled();
  });

  it("applyRandomAllocationPlan uses supplied team names", async () => {
    const tx = {
      team: {
        findMany: vi.fn().mockResolvedValue([{ teamName: "Existing Team" }]),
        create: vi.fn()
          .mockResolvedValueOnce({ id: 11, teamName: "Team Orion" })
          .mockResolvedValueOnce({ id: 22, teamName: "Team Vega" }),
      },
      teamAllocation: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    const result = await applyRandomAllocationPlan(
      5,
      "ent-1",
      [
        { members: [{ id: 1 }] },
        { members: [{ id: 2 }] },
      ],
      { teamNames: ["Team Orion", "Team Vega"] },
    );

    expect(tx.team.create).toHaveBeenNthCalledWith(1, {
      data: {
        enterpriseId: "ent-1",
        projectId: 5,
        teamName: "Team Orion",
      },
      select: { id: true, teamName: true },
    });
    expect(tx.team.create).toHaveBeenNthCalledWith(2, {
      data: {
        enterpriseId: "ent-1",
        projectId: 5,
        teamName: "Team Vega",
      },
      select: { id: true, teamName: true },
    });
    expect(result).toEqual([
      { id: 11, teamName: "Team Orion", memberCount: 1 },
      { id: 22, teamName: "Team Vega", memberCount: 1 },
    ]);
  });

  it("applyRandomAllocationPlan throws when planned students are no longer vacant", async () => {
    const tx = {
      team: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      teamAllocation: {
        findMany: vi.fn().mockResolvedValue([{ userId: 2 }]),
        createMany: vi.fn(),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    await expect(
      applyRandomAllocationPlan(5, "ent-1", [
        { members: [{ id: 1 }, { id: 2 }] },
        { members: [{ id: 3 }] },
      ]),
    ).rejects.toEqual({ code: "STUDENTS_NO_LONGER_VACANT" });

    expect(tx.teamAllocation.createMany).not.toHaveBeenCalled();
    expect(tx.team.findMany).not.toHaveBeenCalled();
  });

  it("applyManualAllocationTeam creates a team and allocations in transaction", async () => {
    const tx = {
      team: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 44, teamName: "Team Gamma" }),
      },
      teamAllocation: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    await expect(
      applyManualAllocationTeam(5, "ent-1", "Team Gamma", [7, 8]),
    ).resolves.toEqual({
      id: 44,
      teamName: "Team Gamma",
      memberCount: 2,
    });

    expect(tx.team.findFirst).toHaveBeenCalledWith({
      where: {
        enterpriseId: "ent-1",
        teamName: "Team Gamma",
      },
      select: {
        id: true,
      },
    });
    expect(tx.teamAllocation.findMany).toHaveBeenCalledWith({
      where: {
        userId: { in: [7, 8] },
        team: {
          projectId: 5,
          archivedAt: null,
        },
      },
      select: {
        userId: true,
      },
    });
    expect(tx.team.create).toHaveBeenCalledWith({
      data: {
        enterpriseId: "ent-1",
        projectId: 5,
        teamName: "Team Gamma",
      },
      select: {
        id: true,
        teamName: true,
      },
    });
    expect(tx.teamAllocation.createMany).toHaveBeenCalledWith({
      data: [
        { teamId: 44, userId: 7 },
        { teamId: 44, userId: 8 },
      ],
      skipDuplicates: true,
    });
  });

  it("applyManualAllocationTeam throws when team name already exists", async () => {
    const tx = {
      team: {
        findFirst: vi.fn().mockResolvedValue({ id: 90 }),
        create: vi.fn(),
      },
      teamAllocation: {
        findMany: vi.fn(),
        createMany: vi.fn(),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    await expect(
      applyManualAllocationTeam(5, "ent-1", "Team Gamma", [7, 8]),
    ).rejects.toEqual({ code: "TEAM_NAME_ALREADY_EXISTS" });

    expect(tx.teamAllocation.findMany).not.toHaveBeenCalled();
    expect(tx.team.create).not.toHaveBeenCalled();
    expect(tx.teamAllocation.createMany).not.toHaveBeenCalled();
  });

  it("applyManualAllocationTeam throws when students are no longer available", async () => {
    const tx = {
      team: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      teamAllocation: {
        findMany: vi.fn().mockResolvedValue([{ userId: 8 }]),
        createMany: vi.fn(),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    await expect(
      applyManualAllocationTeam(5, "ent-1", "Team Gamma", [7, 8]),
    ).rejects.toEqual({ code: "STUDENTS_NO_LONGER_AVAILABLE" });

    expect(tx.team.create).not.toHaveBeenCalled();
    expect(tx.teamAllocation.createMany).not.toHaveBeenCalled();
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
