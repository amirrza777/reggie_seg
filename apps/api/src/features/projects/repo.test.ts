import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProject,
  getModulesForUser,
  getProjectById,
  getQuestionsForProject,
  reviewMcfRequest,
  getTeamById,
  getTeamByUserAndProject,
  getTeammatesInProject,
  getUserProjectDeadline,
  getUserProjects,
  createMcfRequest,
  getMcfRequestsForUserInProject,
  getMcfRequestsForTeamInProject,
  canStaffAccessTeamInProject,
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
    },
    mCFRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    teamDeadlineOverride: {
      deleteMany: vi.fn(),
    },
  },
}));

describe("projects repo", () => {
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

  it("createProject creates and selects persisted project", async () => {
    (prisma.project.create as any).mockResolvedValue({
      id: 1,
      name: "P1",
      moduleId: 2,
      questionnaireTemplateId: 3,
    });
    const result = await createProject("P1", 2, 3, [10, 11]);

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "P1",
        moduleId: 2,
        questionnaireTemplateId: 3,
      },
      select: {
        id: true,
        name: true,
        moduleId: true,
        questionnaireTemplateId: true,
      },
    });
    expect(result).toEqual({
      id: 1,
      name: "P1",
      moduleId: 2,
      questionnaireTemplateId: 3,
    });
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
            assessmentOpenDate: "P-C",
            assessmentDueDate: "P-D",
            feedbackOpenDate: "P-E",
            feedbackDueDate: "P-F",
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

  it("createMcfRequest persists request with expected selected fields", async () => {
    await createMcfRequest(3, 4, 7, "Need support", "Please review team dynamics");

    expect(prisma.mCFRequest.create).toHaveBeenCalledWith(
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
          status: true,
          requester: expect.any(Object),
          reviewedBy: expect.any(Object),
        }),
      })
    );
  });

  it("lists MCF requests for requester and staff team with descending createdAt order", async () => {
    await getMcfRequestsForUserInProject(3, 7);
    expect(prisma.mCFRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 3, requesterUserId: 7 },
        orderBy: { createdAt: "desc" },
      })
    );

    await getMcfRequestsForTeamInProject(3, 4);
    expect(prisma.mCFRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 3, teamId: 4 },
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("reviewMcfRequest marks request as in review without deleting override", async () => {
    (prisma.mCFRequest.findFirst as any).mockResolvedValueOnce({ id: 11, status: "OPEN" });
    (prisma.mCFRequest.update as any).mockResolvedValueOnce({ id: 11, status: "IN_REVIEW" });

    await reviewMcfRequest(3, 4, 11, 7, "IN_REVIEW");

    expect(prisma.mCFRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        data: expect.objectContaining({
          status: "IN_REVIEW",
          reviewedByUserId: 7,
          reviewedAt: expect.any(Date),
        }),
      })
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("reviewMcfRequest marks resolved request as rejected and removes team deadline override", async () => {
    (prisma.mCFRequest.findFirst as any).mockResolvedValueOnce({ id: 11, status: "RESOLVED" });
    const deleteMany = vi.fn().mockResolvedValueOnce({ count: 1 });
    const updateRequest = vi.fn().mockResolvedValueOnce({ id: 11, status: "REJECTED" });
    (prisma.$transaction as any).mockImplementationOnce(async (cb: any) =>
      cb({
        teamDeadlineOverride: { deleteMany },
        mCFRequest: { update: updateRequest },
      })
    );

    const result = await reviewMcfRequest(3, 4, 11, 7, "REJECTED");

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledWith({ where: { teamId: 4 } });
    expect(updateRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        data: expect.objectContaining({
          status: "REJECTED",
          reviewedByUserId: 7,
          reviewedAt: expect.any(Date),
        }),
      })
    );
    expect(result).toEqual({ id: 11, status: "REJECTED" });
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
          teams: { some: { id: 4 } },
          module: expect.objectContaining({
            enterpriseId: "ent-1",
            OR: expect.any(Array),
          }),
        }),
      })
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
      })
    );
  });
});
