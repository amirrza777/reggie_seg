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
    projectStudent: {
      createMany: vi.fn(),
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
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: any) => Promise<any>) =>
      callback({
        project: {
          create: vi.fn(),
        },
        projectStudent: {
          createMany: vi.fn(),
        },
      }),
    ),
  },
}));

describe("projects repo read and create flows", () => {
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
        OR: [
          {
            teams: {
              some: {
                archivedAt: null,
                allocationLifecycle: "ACTIVE",
                allocations: {
                  some: { userId: 11 },
                },
              },
            },
          },
          {
            projectStudents: {
              some: {
                userId: 11,
              },
            },
          },
        ],
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

  it("getModulesForUser resolves OWNER access role for staff users", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 21,
      role: "STAFF",
      enterpriseId: "ent-1",
    });

    (prisma.module.findMany as any)
      .mockResolvedValueOnce([
        {
          id: 7,
          code: null,
          name: "SEGP",
          briefText: null,
          timelineText: null,
          expectationsText: null,
          readinessNotesText: null,
          createdAt: new Date("2025-01-01T00:00:00.000Z"),
          archivedAt: null,
          _count: { moduleLeads: 1, moduleTeachingAssistants: 1 },
          moduleLeads: [{ userId: 21 }],
          moduleTeachingAssistants: [{ userId: 21 }],
          userModules: [{ userId: 21 }],
          projects: [
            {
              _count: { teams: 2 },
              deadline: {
                taskOpenDate: new Date("2025-02-01T00:00:00.000Z"),
                taskDueDate: new Date("2025-02-15T00:00:00.000Z"),
                taskDueDateMcf: null,
                assessmentOpenDate: new Date("2025-03-01T00:00:00.000Z"),
                assessmentDueDate: new Date("2025-04-01T00:00:00.000Z"),
                assessmentDueDateMcf: null,
                feedbackOpenDate: new Date("2025-04-15T00:00:00.000Z"),
                feedbackDueDate: new Date("2025-05-01T00:00:00.000Z"),
                feedbackDueDateMcf: null,
              },
            },
            {
              _count: { teams: 1 },
              deadline: {
                taskOpenDate: new Date("2025-01-01T00:00:00.000Z"),
                taskDueDate: new Date("2025-02-01T00:00:00.000Z"),
                taskDueDateMcf: null,
                assessmentOpenDate: new Date("2025-02-10T00:00:00.000Z"),
                assessmentDueDate: new Date("2025-03-01T00:00:00.000Z"),
                assessmentDueDateMcf: null,
                feedbackOpenDate: new Date("2025-04-01T00:00:00.000Z"),
                feedbackDueDate: new Date("2025-06-15T00:00:00.000Z"),
                feedbackDueDateMcf: null,
              },
            },
          ],
        },
      ]);

    await expect(getModulesForUser(21)).resolves.toEqual([
      expect.objectContaining({
        id: 7,
        accessRole: "OWNER",
        leaderCount: 1,
        teachingAssistantCount: 1,
        teamCount: 3,
        projectCount: 2,
        projectWindowStart: new Date("2025-01-01T00:00:00.000Z"),
        projectWindowEnd: new Date("2025-06-15T00:00:00.000Z"),
      }),
    ]);
  });

  it("getModulesForUser resolves ADMIN_ACCESS role for admins", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 99,
      role: "ADMIN",
      enterpriseId: "ent-1",
    });
    (prisma.module.findMany as any).mockResolvedValueOnce([
      {
        id: 8,
        code: null,
        name: "IOT",
        briefText: null,
        timelineText: null,
        expectationsText: null,
        readinessNotesText: null,
        createdAt: new Date("2025-02-01T00:00:00.000Z"),
        archivedAt: null,
        _count: { moduleLeads: 0, moduleTeachingAssistants: 0 },
        moduleLeads: [],
        moduleTeachingAssistants: [],
        userModules: [],
        projects: [],
      },
    ]);

    await expect(getModulesForUser(99)).resolves.toEqual([
      expect.objectContaining({
        id: 8,
        accessRole: "ADMIN_ACCESS",
        projectWindowStart: null,
        projectWindowEnd: null,
      }),
    ]);
  });

  it("getProjectById queries selected fields", async () => {
    await getProjectById(4);
    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: 4 },
      select: {
        id: true,
        name: true,
        informationText: true,
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
    (prisma.questionnaireTemplate.findUnique as any).mockResolvedValue({ id: 3 });
    const txProjectCreate = vi.fn().mockResolvedValue({
      id: 1,
      name: "P1",
      informationText: "Info board copy",
      moduleId: 2,
      questionnaireTemplateId: 3,
      deadline: {
        ...deadlineInput,
      },
    });
    (prisma.$transaction as any).mockImplementation(async (callback: (tx: any) => Promise<any>) =>
      callback({
        project: { create: txProjectCreate },
        projectStudent: { createMany: vi.fn() },
      }),
    );
    const result = await createProject(99, "P1", 2, 3, undefined, "Info board copy", deadlineInput, undefined);

    expect(txProjectCreate).toHaveBeenCalledWith({
      data: {
        name: "P1",
        informationText: "Info board copy",
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
        informationText: true,
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
      informationText: "Info board copy",
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
    (prisma.module.findFirst as any).mockResolvedValueOnce({ id: 7 }).mockResolvedValueOnce(null);
    (prisma.moduleLead.findFirst as any).mockResolvedValue(null);

    await expect(createProject(44, "Blocked", 7, 3, undefined, null, deadlineInput, undefined)).rejects.toMatchObject({
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
    (prisma.questionnaireTemplate.findUnique as any).mockResolvedValue({ id: 3 });
    (prisma.project.create as any).mockResolvedValue({
      id: 17,
      name: "Admin Project",
      informationText: null,
      moduleId: 7,
      questionnaireTemplateId: 3,
      deadline: {
        ...deadlineInput,
      },
    });

    await expect(createProject(45, "Admin Project", 7, 3, undefined, null, deadlineInput, undefined)).resolves.toMatchObject({
      id: 17,
      moduleId: 7,
    });
    expect(prisma.moduleLead.findFirst).not.toHaveBeenCalled();
    expect(prisma.project.create).toHaveBeenCalled();
  });
});
