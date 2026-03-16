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

describe("teamAllocation repo invites and scope", () => {
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
});
