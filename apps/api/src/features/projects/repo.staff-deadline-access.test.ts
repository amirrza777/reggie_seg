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
  createTeamHealthMessage,
  getTeamHealthMessagesForUserInProject,
  getTeamHealthMessagesForTeamInProject,
  createTeamWarning,
  getTeamWarningsForTeamInProject,
  getProjectWarningsEnabledForTeam,
  updateStaffProjectWarningsEnabled,
} from "./repo.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db.js", () => ({
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
    teamHealthMessage: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    teamWarning: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    teamDeadlineOverride: {
      deleteMany: vi.fn(),
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

  it("updateStaffProjectWarningsEnabled allows admins and module leads, but forbids non-lead staff", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 12,
      role: "ADMIN",
      enterpriseId: "ent-1",
    });
    (prisma.project.findFirst as any).mockResolvedValueOnce({ id: 9 });
    (prisma.project.update as any).mockResolvedValueOnce({ id: 9, warningsEnabled: true });

    await expect(updateStaffProjectWarningsEnabled(12, 9, true)).resolves.toEqual({
      id: 9,
      warningsEnabled: true,
    });

    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 21,
      role: "STAFF",
      enterpriseId: "ent-1",
    });
    (prisma.project.findFirst as any)
      .mockResolvedValueOnce({ id: 9 })
      .mockResolvedValueOnce({ id: 9 });
    (prisma.project.update as any).mockResolvedValueOnce({ id: 9, warningsEnabled: false });

    await expect(updateStaffProjectWarningsEnabled(21, 9, false)).resolves.toEqual({
      id: 9,
      warningsEnabled: false,
    });

    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 31,
      role: "STAFF",
      enterpriseId: "ent-1",
    });
    (prisma.project.findFirst as any)
      .mockResolvedValueOnce({ id: 9 })
      .mockResolvedValueOnce(null);

    await expect(updateStaffProjectWarningsEnabled(31, 9, true)).rejects.toMatchObject({
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

  it("createTeamHealthMessage persists request with expected selected fields", async () => {
    await createTeamHealthMessage(3, 4, 7, "Need support", "Please review team dynamics");

    expect(prisma.teamHealthMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          projectId: 3,
          teamId: 4,
          requesterUserId: 7,
          subject: "Need support",
          details: "Please review team dynamics",
        },
        select: expect.objectContaining({
          id: true,
          resolved: true,
          requester: expect.any(Object),
          reviewedBy: expect.any(Object),
        }),
      })
    );
  });

  it("lists team health messages for requester and staff team with descending createdAt order", async () => {
    await getTeamHealthMessagesForUserInProject(3, 7);
    expect(prisma.teamHealthMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 3, requesterUserId: 7 },
        orderBy: { createdAt: "desc" },
      })
    );

    await getTeamHealthMessagesForTeamInProject(3, 4);
    expect(prisma.teamHealthMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 3, teamId: 4 },
        orderBy: { createdAt: "desc" },
      })
    );
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

  it("getProjectWarningsEnabledForTeam reads warningsEnabled from project scope", async () => {
    (prisma.team.findFirst as any).mockResolvedValueOnce({
      project: { warningsEnabled: true },
    });
    await expect(getProjectWarningsEnabledForTeam(3, 4)).resolves.toBe(true);

    (prisma.team.findFirst as any).mockResolvedValueOnce(null);
    await expect(getProjectWarningsEnabledForTeam(3, 4)).resolves.toBeNull();
  });

  it("reviewTeamHealthMessage marks request as unresolved without deleting override", async () => {
    (prisma.teamHealthMessage.findFirst as any).mockResolvedValueOnce({ id: 11, resolved: false });
    (prisma.teamHealthMessage.update as any).mockResolvedValueOnce({ id: 11, resolved: false });

    await reviewTeamHealthMessage(3, 4, 11, 7, false);

    expect(prisma.teamHealthMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        data: expect.objectContaining({
          resolved: false,
          reviewedByUserId: 7,
          reviewedAt: expect.any(Date),
          responseText: null,
        }),
      })
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("reviewTeamHealthMessage marks resolved request as unresolved and removes team deadline override", async () => {
    (prisma.teamHealthMessage.findFirst as any).mockResolvedValueOnce({ id: 11, resolved: true });
    const deleteMany = vi.fn().mockResolvedValueOnce({ count: 1 });
    const updateRequest = vi.fn().mockResolvedValueOnce({ id: 11, resolved: false });
    (prisma.$transaction as any).mockImplementationOnce(async (cb: any) =>
      cb({
        teamDeadlineOverride: { deleteMany },
        teamHealthMessage: { update: updateRequest },
      })
    );

    const result = await reviewTeamHealthMessage(3, 4, 11, 7, false);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledWith({ where: { teamId: 4 } });
    expect(updateRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        data: expect.objectContaining({
          resolved: false,
          reviewedByUserId: 7,
          reviewedAt: expect.any(Date),
          responseText: null,
        }),
      })
    );
    expect(result).toEqual({ id: 11, resolved: false });
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
