import { beforeEach, describe, expect, it } from "vitest";
import { prisma, setupTeamAllocationRepoTestDefaults } from "./repo.invites-scope.test-helpers.js";
import {
  findModuleStudentsForManualAllocation,
  findVacantModuleStudentsForProject,
  findProjectTeamSummaries,
  findStaffScopedProjectAccess,
  findStaffScopedProject,
} from "./repo.js";

describe("teamAllocation repo invites and scope", () => {
  beforeEach(() => {
    setupTeamAllocationRepoTestDefaults();
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

  it("findStaffScopedProject returns mapped project fields for staff users", async () => {
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
  });

  it("findStaffScopedProject queries staff scope using lead/ta membership filters", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      enterpriseId: "ent-1",
      role: "STAFF",
      active: true,
    });
    (prisma.project.findFirst as any).mockResolvedValueOnce(null);

    await findStaffScopedProject(12, 4);

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

  it("findStaffScopedProjectAccess returns module lead approval capability", async () => {
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
      module: {
        name: "Module A",
        moduleLeads: [{ userId: 12 }],
        moduleTeachingAssistants: [],
      },
    });

    await expect(findStaffScopedProjectAccess(12, 4)).resolves.toEqual({
      id: 4,
      name: "Project A",
      moduleId: 7,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-1",
      actorRole: "STAFF",
      isModuleLead: true,
      isModuleTeachingAssistant: false,
      canApproveAllocationDrafts: true,
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
          select: {
            name: true,
            moduleLeads: {
              where: { userId: 12 },
              select: { userId: true },
              take: 1,
            },
            moduleTeachingAssistants: {
              where: { userId: 12 },
              select: { userId: true },
              take: 1,
            },
          },
        },
      },
    });
  });

  it("findStaffScopedProjectAccess denies approval for teaching assistants", async () => {
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
      module: {
        name: "Module A",
        moduleLeads: [],
        moduleTeachingAssistants: [{ userId: 22 }],
      },
    });

    await expect(findStaffScopedProjectAccess(22, 4)).resolves.toEqual({
      id: 4,
      name: "Project A",
      moduleId: 7,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-1",
      actorRole: "STAFF",
      isModuleLead: false,
      isModuleTeachingAssistant: true,
      canApproveAllocationDrafts: false,
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

    const students = await findModuleStudentsForManualAllocation("ent-3", 22, 5);

    expect(students[0]).toMatchObject({ id: 1, currentTeamId: 10, currentTeamName: "Team Alpha" });
  });

  it("findModuleStudentsForManualAllocation maps null team status when student has no project allocation", async () => {
    (prisma.user.findMany as any).mockResolvedValueOnce([
      {
        id: 2,
        firstName: "B",
        lastName: "B",
        email: "b@example.com",
        teamAllocations: [],
      },
    ]);

    const students = await findModuleStudentsForManualAllocation("ent-3", 22, 5);
    expect(students[0]).toMatchObject({ id: 2, currentTeamId: null, currentTeamName: null });
  });

  it("findModuleStudentsForManualAllocation includes project-scoped team relation in query", async () => {
    (prisma.user.findMany as any).mockResolvedValueOnce([]);

    await findModuleStudentsForManualAllocation("ent-3", 22, 5);

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
