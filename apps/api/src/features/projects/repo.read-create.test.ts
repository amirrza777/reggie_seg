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

  it("getModulesForUser resolves module access roles for staff and admins", async () => {
    (prisma.user.findUnique as any)
      .mockResolvedValueOnce({
        id: 21,
        role: "STAFF",
        enterpriseId: "ent-1",
      })
      .mockResolvedValueOnce({
        id: 99,
        role: "ADMIN",
        enterpriseId: "ent-1",
      });

    (prisma.module.findMany as any)
      .mockResolvedValueOnce([
        {
          id: 7,
          name: "SEGP",
          briefText: null,
          timelineText: null,
          expectationsText: null,
          readinessNotesText: null,
          moduleLeads: [{ userId: 21 }],
          moduleTeachingAssistants: [{ userId: 21 }],
          userModules: [{ userId: 21 }],
          projects: [{ _count: { teams: 2 } }, { _count: { teams: 1 } }],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 8,
          name: "IOT",
          briefText: null,
          timelineText: null,
          expectationsText: null,
          readinessNotesText: null,
          moduleLeads: [],
          moduleTeachingAssistants: [],
          userModules: [],
          projects: [],
        },
      ]);

    await expect(getModulesForUser(21)).resolves.toEqual([
      expect.objectContaining({
        id: 7,
        accessRole: "OWNER",
        teamCount: 3,
        projectCount: 2,
      }),
    ]);

    await expect(getModulesForUser(99)).resolves.toEqual([
      expect.objectContaining({
        id: 8,
        accessRole: "ADMIN_ACCESS",
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
});
