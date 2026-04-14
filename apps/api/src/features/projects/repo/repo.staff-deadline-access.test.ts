import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canStaffAccessTeamInProject,
  getQuestionsForProject,
  getStaffProjectTeams,
  getStaffProjects,
  getTeamById,
  getTeamByUserAndProject,
  getTeammatesInProject,
  getUserProjectDeadline,
  getUserProjects,
  createTeamWarning,
  getTeamWarningsForTeamInProject,
  getStaffProjectWarningsConfig,
  updateStaffProjectWarningsConfig,
} from "../repo.js";
import { prisma } from "../../../shared/db.js";

vi.mock("../../../shared/db.js", () => ({
  prisma: {
    $transaction: vi.fn(),
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    teamAllocation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    module: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    moduleLead: {
      findFirst: vi.fn(),
    },
    questionnaireTemplate: {
      findFirst: vi.fn(),
    },
    teamWarning: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("projects repo staff and deadline access queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getTeammatesInProject filters by shared team and project", async () => {
    await getTeammatesInProject(5, 9);

    expect(prisma.teamAllocation.findMany).toHaveBeenCalledWith({
      where: {
        team: {
          projectId: 9,
          archivedAt: null,
          allocationLifecycle: "ACTIVE",
          allocations: {
            some: { userId: 5 },
          },
        },
      },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  });

  it("getUserProjectDeadline returns null when user has no team", async () => {
    (prisma.teamAllocation.findFirst as any).mockResolvedValue(null);
    await expect(getUserProjectDeadline(1, 2)).resolves.toBeNull();
  });

  it("getUserProjectDeadline merges override with project deadline and sets isOverridden", async () => {
    (prisma.teamAllocation.findFirst as any).mockResolvedValue({
      team: {
        deadlineProfile: "STANDARD",
        deadlineOverride: {
          taskOpenDate: "A",
          taskDueDate: null,
          assessmentOpenDate: null,
          assessmentDueDate: "D",
          feedbackOpenDate: null,
          feedbackDueDate: null,
        },
        project: {
          deadline: {
            taskOpenDate: "P-A",
            taskDueDate: "P-B",
            taskDueDateMcf: "P-B-MCF",
            assessmentOpenDate: "P-C",
            assessmentDueDate: "P-D",
            assessmentDueDateMcf: "P-D-MCF",
            feedbackOpenDate: "P-E",
            feedbackDueDate: "P-F",
            feedbackDueDateMcf: "P-F-MCF",
          },
        },
      },
    });

    await expect(getUserProjectDeadline(1, 2)).resolves.toEqual({
      taskOpenDate: "A",
      taskDueDate: "P-B",
      assessmentOpenDate: "P-C",
      assessmentDueDate: "D",
      feedbackOpenDate: "P-E",
      feedbackDueDate: "P-F",
      teamAllocationQuestionnaireOpenDate: null,
      teamAllocationQuestionnaireDueDate: null,
      teamAllocationInviteDueDate: null,
      isOverridden: true,
      overrideScope: "TEAM",
      deadlineProfile: "STANDARD",
    });
  });

  it("getTeamById and getTeamByUserAndProject query with expected selects", async () => {
    await getTeamById(3);
    expect(prisma.team.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 3, archivedAt: null, allocationLifecycle: "ACTIVE" },
        select: expect.objectContaining({
          id: true,
          teamName: true,
          allocations: expect.any(Object),
        }),
      }),
    );

    await getTeamByUserAndProject(1, 2);
    expect(prisma.team.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: 2,
          archivedAt: null,
          allocationLifecycle: "ACTIVE",
          allocations: { some: { userId: 1 } },
        },
        select: expect.objectContaining({
          id: true,
          teamName: true,
          allocations: expect.any(Object),
        }),
      }),
    );
  });

  it("getStaffProjects gives admins enterprise-wide project visibility", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 12,
      role: "ADMIN",
      enterpriseId: "ent-1",
    });
    (prisma.project.findMany as any).mockResolvedValue([]);

    await getStaffProjects(12);

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          module: {
            enterpriseId: "ent-1",
          },
        },
      }),
    );
  });

  it("getStaffProjects limits non-admin staff to assigned modules", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 21,
      role: "STAFF",
      enterpriseId: "ent-1",
    });
    (prisma.project.findMany as any).mockResolvedValue([]);

    await getStaffProjects(21);

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              module: {
                enterpriseId: "ent-1",
              },
            },
            {
              OR: [
                { module: { moduleLeads: { some: { userId: 21 } } } },
                { module: { moduleTeachingAssistants: { some: { userId: 21 } } } },
              ],
            },
          ],
        },
      }),
    );
  });

  it("getStaffProjectTeams enforces admin-all vs staff-scoped access filters", async () => {
    (prisma.user.findUnique as any)
      .mockResolvedValueOnce({
        id: 12,
        role: "ADMIN",
        enterpriseId: "ent-1",
      })
      .mockResolvedValueOnce({
        id: 21,
        role: "STAFF",
        enterpriseId: "ent-1",
      });
    (prisma.project.findFirst as any).mockResolvedValue(null);

    await getStaffProjectTeams(12, 9);
    expect(prisma.project.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          id: 9,
          module: {
            enterpriseId: "ent-1",
          },
        },
      }),
    );

    await getStaffProjectTeams(21, 9);
    expect(prisma.project.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          id: 9,
          module: {
            enterpriseId: "ent-1",
            OR: [
              { moduleLeads: { some: { userId: 21 } } },
              { moduleTeachingAssistants: { some: { userId: 21 } } },
            ],
          },
        },
      }),
    );
  });

  it("getStaffProjectWarningsConfig and updateStaffProjectWarningsConfig enforce scope and persist config", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 12,
      role: "ADMIN",
      enterpriseId: "ent-1",
    });
    (prisma.project.findFirst as any).mockResolvedValueOnce({ id: 9 });
    (prisma.project.findUnique as any).mockResolvedValueOnce({
      id: 9,
      warningsConfig: { version: 1, rules: [] },
    });

    await expect(getStaffProjectWarningsConfig(12, 9)).resolves.toEqual({
      id: 9,
      warningsConfig: { version: 1, rules: [] },
    });

    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 21,
      role: "STAFF",
      enterpriseId: "ent-1",
    });
    (prisma.project.findFirst as any)
      .mockResolvedValueOnce({ id: 9 })
      .mockResolvedValueOnce({ id: 9 });
    (prisma.project.findUnique as any).mockResolvedValueOnce({
      id: 9,
      archivedAt: null,
      module: { archivedAt: null },
    });
    (prisma.project.update as any).mockResolvedValueOnce({
      id: 9,
      warningsConfig: { version: 1, rules: [{ key: "LOW_ATTENDANCE", enabled: true }] },
    });

    await expect(
      updateStaffProjectWarningsConfig(21, 9, {
        version: 1,
        rules: [{ key: "LOW_ATTENDANCE", enabled: true }],
      }),
    ).resolves.toEqual({
      id: 9,
      warningsConfig: { version: 1, rules: [{ key: "LOW_ATTENDANCE", enabled: true }] },
    });

    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 31,
      role: "STAFF",
      enterpriseId: "ent-1",
    });
    (prisma.project.findFirst as any)
      .mockResolvedValueOnce({ id: 9 })
      .mockResolvedValueOnce(null);

    await expect(getStaffProjectWarningsConfig(31, 9)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("getQuestionsForProject fetches template questions ordered by `order`", async () => {
    await getQuestionsForProject(6);
    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: 6 },
      select: {
        questionnaireTemplate: {
          select: {
            id: true,
            questions: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                label: true,
                type: true,
                order: true,
                configs: true,
              },
            },
          },
        },
      },
    });
  });

  it("creates and lists team warnings with expected filters and selected fields", async () => {
    await createTeamWarning(3, 4, {
      type: "LOW_ATTENDANCE",
      severity: "HIGH",
      title: "Attendance below threshold",
      details: "Attendance below 70% in last 30 days.",
      source: "MANUAL",
      createdByUserId: 7,
    });

    expect(prisma.teamWarning.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 3,
          teamId: 4,
          type: "LOW_ATTENDANCE",
          severity: "HIGH",
          title: "Attendance below threshold",
          source: "MANUAL",
          createdByUserId: 7,
        }),
        select: expect.objectContaining({
          id: true,
          type: true,
          severity: true,
          createdBy: expect.any(Object),
        }),
      }),
    );

    await getTeamWarningsForTeamInProject(3, 4);
    expect(prisma.teamWarning.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 3, teamId: 4 },
        orderBy: [{ active: "desc" }, { createdAt: "desc" }],
      }),
    );

    await getTeamWarningsForTeamInProject(3, 4, { activeOnly: true });
    expect(prisma.teamWarning.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 3, teamId: 4, active: true },
      }),
    );
  });

  it("canStaffAccessTeamInProject verifies role scoped staff access", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 7,
      role: "STAFF",
      enterpriseId: "ent-1",
    });
    (prisma.project.findFirst as any).mockResolvedValueOnce({ id: 3 });

    await expect(canStaffAccessTeamInProject(7, 3, 4)).resolves.toBe(true);
    expect(prisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 3,
          teams: { some: { id: 4, archivedAt: null, allocationLifecycle: "ACTIVE" } },
          module: expect.objectContaining({
            enterpriseId: "ent-1",
            OR: expect.any(Array),
          }),
        }),
      }),
    );

    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 8,
      role: "ADMIN",
      enterpriseId: "ent-1",
    });
    (prisma.project.findFirst as any).mockResolvedValueOnce({ id: 3 });

    await expect(canStaffAccessTeamInProject(8, 3, 4)).resolves.toBe(true);
    expect(prisma.project.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          module: { enterpriseId: "ent-1" },
        }),
      }),
    );
  });
});
