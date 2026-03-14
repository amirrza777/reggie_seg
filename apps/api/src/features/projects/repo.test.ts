import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProject,
  getModulesForUser,
  getProjectById,
  getQuestionsForProject,
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

describe("projects repo", () => {
  const deadlineInput = {
    taskOpenDate: new Date("2026-03-01T09:00:00.000Z"),
    taskDueDate: new Date("2026-03-08T17:00:00.000Z"),
    taskDueDateMcf: new Date("2026-03-15T17:00:00.000Z"),
    assessmentOpenDate: new Date("2026-03-09T09:00:00.000Z"),
    assessmentDueDate: new Date("2026-03-12T17:00:00.000Z"),
    assessmentDueDateMcf: new Date("2026-03-19T17:00:00.000Z"),
    feedbackOpenDate: new Date("2026-03-13T09:00:00.000Z"),
    feedbackDueDate: new Date("2026-03-16T17:00:00.000Z"),
    feedbackDueDateMcf: new Date("2026-03-23T17:00:00.000Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getUserProjects queries projects by membership with module select", async () => {
    await getUserProjects(11);

    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: {
        teams: {
          some: {
            allocations: {
              some: { userId: 11 },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        archivedAt: true,
        module: { select: { name: true } },
      },
    });
  });

  it("getModulesForUser keeps teaching-assistant modules out of workspace scope for students", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 21,
      role: "STUDENT",
      enterpriseId: "ent-1",
    });
    (prisma.module.findMany as any).mockResolvedValue([]);

    await getModulesForUser(21);

    expect(prisma.module.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          enterpriseId: "ent-1",
          userModules: { some: { userId: 21, enterpriseId: "ent-1" } },
        },
      })
    );
  });

  it("getModulesForUser returns teaching-assistant modules in staff scope for students", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 21,
      role: "STUDENT",
      enterpriseId: "ent-1",
    });
    (prisma.module.findMany as any).mockResolvedValue([]);

    await getModulesForUser(21, { staffOnly: true });

    expect(prisma.module.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          enterpriseId: "ent-1",
          moduleTeachingAssistants: { some: { userId: 21 } },
        },
      })
    );
  });

  it("getProjectById queries selected fields", async () => {
    await getProjectById(4);
    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: 4 },
      select: {
        id: true,
        name: true,
        moduleId: true,
        questionnaireTemplateId: true,
      },
    });
  });

  it("createProject creates and selects persisted project for an authorised module lead", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 99,
      role: "STAFF",
      enterpriseId: "ent-1",
    });
    (prisma.module.findFirst as any).mockResolvedValue({ id: 2 });
    (prisma.moduleLead.findFirst as any).mockResolvedValue({ moduleId: 2 });
    (prisma.questionnaireTemplate.findFirst as any).mockResolvedValue({ id: 3 });
    (prisma.project.create as any).mockResolvedValue({
      id: 1,
      name: "P1",
      moduleId: 2,
      questionnaireTemplateId: 3,
      deadline: {
        ...deadlineInput,
      },
    });
    const result = await createProject(99, "P1", 2, 3, deadlineInput);

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "P1",
        moduleId: 2,
        questionnaireTemplateId: 3,
        deadline: {
          create: {
            taskOpenDate: deadlineInput.taskOpenDate,
            taskDueDate: deadlineInput.taskDueDate,
            taskDueDateMcf: deadlineInput.taskDueDateMcf,
            assessmentOpenDate: deadlineInput.assessmentOpenDate,
            assessmentDueDate: deadlineInput.assessmentDueDate,
            assessmentDueDateMcf: deadlineInput.assessmentDueDateMcf,
            feedbackOpenDate: deadlineInput.feedbackOpenDate,
            feedbackDueDate: deadlineInput.feedbackDueDate,
            feedbackDueDateMcf: deadlineInput.feedbackDueDateMcf,
          },
        },
      },
      select: {
        id: true,
        name: true,
        moduleId: true,
        questionnaireTemplateId: true,
        deadline: {
          select: {
            taskOpenDate: true,
            taskDueDate: true,
            taskDueDateMcf: true,
            assessmentOpenDate: true,
            assessmentDueDate: true,
            assessmentDueDateMcf: true,
            feedbackOpenDate: true,
            feedbackDueDate: true,
            feedbackDueDateMcf: true,
          },
        },
      },
    });
    expect(result).toEqual({
      id: 1,
      name: "P1",
      moduleId: 2,
      questionnaireTemplateId: 3,
      deadline: {
        ...deadlineInput,
      },
    });
  });

  it("createProject rejects staff who are not module leads", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 44,
      role: "STAFF",
      enterpriseId: "ent-1",
    });
    (prisma.module.findFirst as any).mockResolvedValue({ id: 7 });
    (prisma.moduleLead.findFirst as any).mockResolvedValue(null);

    await expect(createProject(44, "Blocked", 7, 3, deadlineInput)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(prisma.project.create).not.toHaveBeenCalled();
  });

  it("createProject allows enterprise admins without module-lead membership", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 45,
      role: "ENTERPRISE_ADMIN",
      enterpriseId: "ent-1",
    });
    (prisma.module.findFirst as any).mockResolvedValue({ id: 7 });
    (prisma.questionnaireTemplate.findFirst as any).mockResolvedValue({ id: 3 });
    (prisma.project.create as any).mockResolvedValue({
      id: 17,
      name: "Admin Project",
      moduleId: 7,
      questionnaireTemplateId: 3,
      deadline: {
        ...deadlineInput,
      },
    });

    await expect(createProject(45, "Admin Project", 7, 3, deadlineInput)).resolves.toMatchObject({
      id: 17,
      moduleId: 7,
    });
    expect(prisma.moduleLead.findFirst).not.toHaveBeenCalled();
    expect(prisma.project.create).toHaveBeenCalled();
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
