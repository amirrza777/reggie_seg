import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProject,
  getModulesForUser,
  getProjectById,
  getQuestionsForProject,
  getStaffProjectTeams,
  getStaffProjects,
  getTeamById,
  getTeamByUserAndProject,
  getTeammatesInProject,
  getUserProjectDeadline,
  getUserProjects,
} from "./repo.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
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
  },
}));

describe("projects repo staff and deadline queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getTeammatesInProject filters by shared team and project", async () => {
    await getTeammatesInProject(5, 9);

    expect(prisma.teamAllocation.findMany).toHaveBeenCalledWith({
      where: {
        team: {
          projectId: 9,
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
    expect(prisma.team.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 3 },
        select: expect.objectContaining({
          id: true,
          teamName: true,
          allocations: expect.any(Object),
        }),
      })
    );

    await getTeamByUserAndProject(1, 2);
    expect(prisma.team.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: 2,
          allocations: { some: { userId: 1 } },
        },
        select: expect.objectContaining({
          id: true,
          teamName: true,
          allocations: expect.any(Object),
        }),
      })
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
});
