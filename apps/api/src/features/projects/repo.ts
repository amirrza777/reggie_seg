import { prisma } from "../../shared/db.js";

export type ProjectDeadlineInput = {
  taskOpenDate: Date;
  taskDueDate: Date;
  taskDueDateMcf: Date;
  assessmentOpenDate: Date;
  assessmentDueDate: Date;
  assessmentDueDateMcf: Date;
  feedbackOpenDate: Date;
  feedbackDueDate: Date;
  feedbackDueDateMcf: Date;
};

export type StudentDeadlineOverrideInput = {
  taskOpenDate?: Date | null;
  taskDueDate?: Date | null;
  assessmentOpenDate?: Date | null;
  assessmentDueDate?: Date | null;
  feedbackOpenDate?: Date | null;
  feedbackDueDate?: Date | null;
  reason?: string | null;
};

export async function getUserProjects(userId: number) {
  return prisma.project.findMany({
    where: {
      teams: {
        some: {
          allocations: {
            some: {
              userId,
            },
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      archivedAt: true,
      module: {
        select: {
          name: true,
        },
      },
    },
  });
}

export async function getModulesForUser(userId: number, options?: { staffOnly?: boolean }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, enterpriseId: true },
  });

  if (!user) {
    return [];
  }

  const membershipFilter =
    user.role === "ADMIN" || user.role === "ENTERPRISE_ADMIN"
      ? { enterpriseId: user.enterpriseId }
      : user.role === "STAFF"
        ? {
            enterpriseId: user.enterpriseId,
            OR: [
              { moduleLeads: { some: { userId: user.id } } },
              { moduleTeachingAssistants: { some: { userId: user.id } } },
              { userModules: { some: { userId: user.id, enterpriseId: user.enterpriseId } } },
            ],
          }
        : {
            enterpriseId: user.enterpriseId,
            ...(options?.staffOnly
              ? {
                  moduleTeachingAssistants: { some: { userId: user.id } },
                }
              : {
                  userModules: { some: { userId: user.id, enterpriseId: user.enterpriseId } },
                }),
          };

  const modules = await prisma.module.findMany({
    where: membershipFilter,
    select: {
      id: true,
      name: true,
      briefText: true,
      timelineText: true,
      expectationsText: true,
      readinessNotesText: true,
      moduleLeads: {
        where: { userId: user.id },
        select: { userId: true },
        take: 1,
      },
      moduleTeachingAssistants: {
        where: { userId: user.id },
        select: { userId: true },
        take: 1,
      },
      userModules: {
        where: { userId: user.id, enterpriseId: user.enterpriseId },
        select: { userId: true },
        take: 1,
      },
      projects: {
        select: {
          _count: {
            select: {
              teams: true,
            },
          },
        },
      },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });

  return modules.map((module) => {
    const isOwner = module.moduleLeads.length > 0;
    const isTeachingAssistant = module.moduleTeachingAssistants.length > 0;
    const isEnrolled = module.userModules.length > 0;

    const accessRole = isOwner
      ? "OWNER"
      : isTeachingAssistant
        ? "TEACHING_ASSISTANT"
        : isEnrolled
          ? "ENROLLED"
          : user.role === "ADMIN" || user.role === "ENTERPRISE_ADMIN"
            ? "ADMIN_ACCESS"
            : "ENROLLED";

    return {
      id: module.id,
      name: module.name,
      briefText: module.briefText,
      timelineText: module.timelineText,
      expectationsText: module.expectationsText,
      readinessNotesText: module.readinessNotesText,
      teamCount: module.projects.reduce((sum, project) => sum + project._count.teams, 0),
      projectCount: module.projects.length,
      accessRole,
    };
  });
}

async function getScopedStaffUser(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, enterpriseId: true },
  });
}

async function getScopedStaffProjectDeadline(actorUserId: number, projectId: number) {
  const actor = await getScopedStaffUser(actorUserId);
  if (!actor) {
    throw { code: "FORBIDDEN", message: "User not found" };
  }

  const isStaffRole = actor.role === "STAFF" || actor.role === "ENTERPRISE_ADMIN" || actor.role === "ADMIN";
  if (!isStaffRole) {
    throw { code: "FORBIDDEN", message: "Only staff can manage student deadline overrides" };
  }

  const roleCanAccessAll = actor.role === "ADMIN" || actor.role === "ENTERPRISE_ADMIN";
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      module: {
        enterpriseId: actor.enterpriseId,
        ...(roleCanAccessAll
          ? {}
          : {
              OR: [
                { moduleLeads: { some: { userId: actorUserId } } },
                { moduleTeachingAssistants: { some: { userId: actorUserId } } },
              ],
            }),
      },
    },
    select: {
      id: true,
      deadline: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!project || !project.deadline) {
    throw { code: "PROJECT_NOT_FOUND" };
  }

  return { actor, projectDeadlineId: project.deadline.id, projectId: project.id };
}

export async function getStaffProjects(userId: number) {
  const user = await getScopedStaffUser(userId);
  if (!user) return [];

  const baseWhere = {
    module: {
      enterpriseId: user.enterpriseId,
    },
  };

  const where =
    user.role === "ADMIN" || user.role === "ENTERPRISE_ADMIN"
      ? baseWhere
      : {
          ...baseWhere,
          module: {
            ...baseWhere.module,
            OR: [
              { moduleLeads: { some: { userId } } },
              { moduleTeachingAssistants: { some: { userId } } },
            ],
          },
        };

  return prisma.project.findMany({
    where,
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      moduleId: true,
      archivedAt: true,
      module: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          teams: true,
        },
      },
    },
  });
}

export async function getStaffProjectTeams(userId: number, projectId: number) {
  const user = await getScopedStaffUser(userId);
  if (!user) return null;

  const roleCanAccessAll = user.role === "ADMIN" || user.role === "ENTERPRISE_ADMIN";

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      module: {
        enterpriseId: user.enterpriseId,
        ...(roleCanAccessAll
          ? {}
          : {
              OR: [
                { moduleLeads: { some: { userId } } },
                { moduleTeachingAssistants: { some: { userId } } },
              ],
            }),
      },
    },
    select: {
      id: true,
      name: true,
      moduleId: true,
      module: {
        select: {
          name: true,
        },
      },
      teams: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          teamName: true,
          projectId: true,
          createdAt: true,
          inactivityFlag: true,
          deadlineProfile: true,
          deadlineOverride: {
            select: {
              id: true,
            },
          },
          allocations: {
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
          },
        },
      },
    },
  });

  return project;
}

export async function getStaffStudentDeadlineOverrides(actorUserId: number, projectId: number) {
  const { projectDeadlineId } = await getScopedStaffProjectDeadline(actorUserId, projectId);

  const overrides = await prisma.studentDeadlineOverride.findMany({
    where: { projectDeadlineId },
    select: {
      id: true,
      userId: true,
      taskOpenDate: true,
      taskDueDate: true,
      assessmentOpenDate: true,
      assessmentDueDate: true,
      feedbackOpenDate: true,
      feedbackDueDate: true,
      reason: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });

  return overrides;
}

export async function upsertStaffStudentDeadlineOverride(
  actorUserId: number,
  projectId: number,
  studentId: number,
  payload: StudentDeadlineOverrideInput,
) {
  const { projectDeadlineId } = await getScopedStaffProjectDeadline(actorUserId, projectId);

  const isStudentInProject = await prisma.teamAllocation.findFirst({
    where: {
      userId: studentId,
      team: { projectId },
    },
    select: { userId: true },
  });
  if (!isStudentInProject) {
    throw { code: "STUDENT_NOT_IN_PROJECT" };
  }

  const data = {
    ...(payload.taskOpenDate !== undefined ? { taskOpenDate: payload.taskOpenDate } : {}),
    ...(payload.taskDueDate !== undefined ? { taskDueDate: payload.taskDueDate } : {}),
    ...(payload.assessmentOpenDate !== undefined ? { assessmentOpenDate: payload.assessmentOpenDate } : {}),
    ...(payload.assessmentDueDate !== undefined ? { assessmentDueDate: payload.assessmentDueDate } : {}),
    ...(payload.feedbackOpenDate !== undefined ? { feedbackOpenDate: payload.feedbackOpenDate } : {}),
    ...(payload.feedbackDueDate !== undefined ? { feedbackDueDate: payload.feedbackDueDate } : {}),
    ...(payload.reason !== undefined ? { reason: payload.reason } : {}),
  };

  const updated = await prisma.studentDeadlineOverride.upsert({
    where: {
      userId_projectDeadlineId: {
        userId: studentId,
        projectDeadlineId,
      },
    },
    update: data,
    create: {
      userId: studentId,
      projectDeadlineId,
      createdByUserId: actorUserId,
      taskOpenDate: payload.taskOpenDate ?? null,
      taskDueDate: payload.taskDueDate ?? null,
      assessmentOpenDate: payload.assessmentOpenDate ?? null,
      assessmentDueDate: payload.assessmentDueDate ?? null,
      feedbackOpenDate: payload.feedbackOpenDate ?? null,
      feedbackDueDate: payload.feedbackDueDate ?? null,
      reason: payload.reason ?? null,
    },
    select: {
      id: true,
      userId: true,
      taskOpenDate: true,
      taskDueDate: true,
      assessmentOpenDate: true,
      assessmentDueDate: true,
      feedbackOpenDate: true,
      feedbackDueDate: true,
      reason: true,
      updatedAt: true,
    },
  });

  return updated;
}

export async function clearStaffStudentDeadlineOverride(
  actorUserId: number,
  projectId: number,
  studentId: number,
) {
  const { projectDeadlineId } = await getScopedStaffProjectDeadline(actorUserId, projectId);

  const deleted = await prisma.studentDeadlineOverride.deleteMany({
    where: {
      userId: studentId,
      projectDeadlineId,
    },
  });

  return { cleared: deleted.count > 0 };
}

export async function getProjectById(projectId: number) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      moduleId: true,
      questionnaireTemplateId: true,
    },
  });
}

export async function createProject(
  actorUserId: number,
  name: string,
  moduleId: number,
  questionnaireTemplateId: number,
  deadline: ProjectDeadlineInput
) {
  const actor = await getScopedStaffUser(actorUserId);
  if (!actor) {
    throw { code: "FORBIDDEN", message: "User not found" };
  }

  const isStaffRole = actor.role === "STAFF" || actor.role === "ENTERPRISE_ADMIN" || actor.role === "ADMIN";
  if (!isStaffRole) {
    throw { code: "FORBIDDEN", message: "Only staff can create projects" };
  }

  const moduleRecord = await prisma.module.findFirst({
    where: { id: moduleId, enterpriseId: actor.enterpriseId },
    select: { id: true },
  });
  if (!moduleRecord) {
    throw { code: "MODULE_NOT_FOUND" };
  }

  const roleCanOverride = actor.role === "ADMIN" || actor.role === "ENTERPRISE_ADMIN";
  if (!roleCanOverride) {
    const isModuleLead = await prisma.moduleLead.findFirst({
      where: { moduleId, userId: actor.id },
      select: { moduleId: true },
    });
    if (!isModuleLead) {
      throw { code: "FORBIDDEN", message: "Only module leads can create projects for this module" };
    }
  }

  const templateRecord = await prisma.questionnaireTemplate.findFirst({
    where: {
      id: questionnaireTemplateId,
      owner: { enterpriseId: actor.enterpriseId },
    },
    select: { id: true },
  });
  if (!templateRecord) {
    throw { code: "TEMPLATE_NOT_FOUND" };
  }

  return prisma.project.create({
    data: {
      name,
      moduleId,
      questionnaireTemplateId,
      deadline: {
        create: {
          taskOpenDate: deadline.taskOpenDate,
          taskDueDate: deadline.taskDueDate,
          taskDueDateMcf: deadline.taskDueDateMcf,
          assessmentOpenDate: deadline.assessmentOpenDate,
          assessmentDueDate: deadline.assessmentDueDate,
          assessmentDueDateMcf: deadline.assessmentDueDateMcf,
          feedbackOpenDate: deadline.feedbackOpenDate,
          feedbackDueDate: deadline.feedbackDueDate,
          feedbackDueDateMcf: deadline.feedbackDueDateMcf,
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
}

export async function updateStaffTeamDeadlineProfile(
  actorUserId: number,
  teamId: number,
  deadlineProfile: "STANDARD" | "MCF",
) {
  const actor = await getScopedStaffUser(actorUserId);
  if (!actor) {
    throw { code: "FORBIDDEN", message: "User not found" };
  }

  const isStaffRole = actor.role === "STAFF" || actor.role === "ENTERPRISE_ADMIN" || actor.role === "ADMIN";
  if (!isStaffRole) {
    throw { code: "FORBIDDEN", message: "Only staff can update team deadline profile" };
  }

  const roleCanAccessAll = actor.role === "ADMIN" || actor.role === "ENTERPRISE_ADMIN";

  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      project: {
        module: {
          enterpriseId: actor.enterpriseId,
          ...(roleCanAccessAll
            ? {}
            : {
                OR: [
                  { moduleLeads: { some: { userId: actorUserId } } },
                  { moduleTeachingAssistants: { some: { userId: actorUserId } } },
                ],
              }),
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!team) {
    throw { code: "TEAM_NOT_FOUND" };
  }

  return prisma.team.update({
    where: { id: teamId },
    data: { deadlineProfile },
    select: {
      id: true,
      deadlineProfile: true,
    },
  });
}

export async function getTeammatesInProject(userId: number, projectId: number) {
  return prisma.teamAllocation.findMany({
    where: {
      team: {
        projectId,
        allocations: {
          some: {
            userId,
          },
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
}

export async function getUserProjectDeadline(userId: number, projectId: number) {
  const userTeam = await prisma.teamAllocation.findFirst({
    where: {
      userId,
      team: {
        projectId,
      },
    },
    select: {
      team: {
        select: {
          id: true,
          deadlineProfile: true,
          deadlineOverride: {
            select: {
              taskOpenDate: true,
              taskDueDate: true,
              assessmentOpenDate: true,
              assessmentDueDate: true,
              feedbackOpenDate: true,
              feedbackDueDate: true,
            },
          },
          project: {
            select: {
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
                  studentOverrides: {
                    where: { userId },
                    take: 1,
                    select: {
                      taskOpenDate: true,
                      taskDueDate: true,
                      assessmentOpenDate: true,
                      assessmentDueDate: true,
                      feedbackOpenDate: true,
                      feedbackDueDate: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!userTeam) {
    return null;
  }
  const projectDeadline = userTeam.team.project.deadline;
  const teamOverride = userTeam.team.deadlineOverride;
  const studentOverride = projectDeadline?.studentOverrides?.[0];
  const teamUsesMcfDeadline = userTeam.team.deadlineProfile === "MCF";

  const taskDueDate =
    studentOverride?.taskDueDate ??
    teamOverride?.taskDueDate ??
    (teamUsesMcfDeadline
      ? projectDeadline?.taskDueDateMcf ?? projectDeadline?.taskDueDate
      : projectDeadline?.taskDueDate);
  const assessmentDueDate =
    studentOverride?.assessmentDueDate ??
    teamOverride?.assessmentDueDate ??
    (teamUsesMcfDeadline
      ? projectDeadline?.assessmentDueDateMcf ?? projectDeadline?.assessmentDueDate
      : projectDeadline?.assessmentDueDate);
  const feedbackDueDate =
    studentOverride?.feedbackDueDate ??
    teamOverride?.feedbackDueDate ??
    (teamUsesMcfDeadline
      ? projectDeadline?.feedbackDueDateMcf ?? projectDeadline?.feedbackDueDate
      : projectDeadline?.feedbackDueDate);

  const hasStudentOverride = Boolean(
    studentOverride?.taskOpenDate ||
    studentOverride?.taskDueDate ||
    studentOverride?.assessmentOpenDate ||
    studentOverride?.assessmentDueDate ||
    studentOverride?.feedbackOpenDate ||
    studentOverride?.feedbackDueDate
  );
  const hasTeamOverride = Boolean(teamOverride);

  return {
    taskOpenDate: studentOverride?.taskOpenDate ?? teamOverride?.taskOpenDate ?? projectDeadline?.taskOpenDate,
    taskDueDate,
    assessmentOpenDate:
      studentOverride?.assessmentOpenDate ?? teamOverride?.assessmentOpenDate ?? projectDeadline?.assessmentOpenDate,
    assessmentDueDate,
    feedbackOpenDate: studentOverride?.feedbackOpenDate ?? teamOverride?.feedbackOpenDate ?? projectDeadline?.feedbackOpenDate,
    feedbackDueDate,
    isOverridden: hasStudentOverride || hasTeamOverride,
    overrideScope: hasStudentOverride ? "STUDENT" : hasTeamOverride ? "TEAM" : "NONE",
    deadlineProfile: userTeam.team.deadlineProfile,
  };
}

export async function getTeamById(teamId: number) {
  return prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      teamName: true,
      projectId: true,
      createdAt: true,
      allocations: {
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
      },
    },
  });
}

export async function getTeamByUserAndProject(userId: number, projectId: number) {
  return prisma.team.findFirst({
    where: {
      projectId,
      allocations: {
        some: {
          userId,
        },
      },
    },
    select: {
      id: true,
      teamName: true,
      projectId: true,
      createdAt: true,
      allocations: {
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
      },
    },
  });
}

export async function getQuestionsForProject(projectId: number) {
  return prisma.project.findUnique({
    where: { id: projectId },
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
}

type RawStaffMarking = {
  mark: number | null;
  formativeFeedback: string | null;
  updatedAt: Date;
  marker: { id: number; firstName: string; lastName: string };
};

function mapStaffMarking(marking: RawStaffMarking | null) {
  if (!marking) return null;
  return {
    mark: marking.mark ?? null,
    formativeFeedback: marking.formativeFeedback ?? null,
    updatedAt: marking.updatedAt.toISOString(),
    marker: {
      id: marking.marker.id,
      firstName: marking.marker.firstName,
      lastName: marking.marker.lastName,
    },
  };
}

export async function getUserProjectMarking(userId: number, projectId: number) {
  const enrollment = await prisma.teamAllocation.findFirst({
    where: {
      userId,
      team: { projectId },
    },
    select: {
      teamId: true,
      team: {
        select: {
          staffTeamMarking: {
            select: {
              mark: true,
              formativeFeedback: true,
              updatedAt: true,
              marker: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          staffStudentMarkings: {
            where: { studentUserId: userId },
            select: {
              mark: true,
              formativeFeedback: true,
              updatedAt: true,
              marker: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!enrollment) {
    return null;
  }

  const studentMarking = enrollment.team.staffStudentMarkings[0] ?? null;
  return {
    teamId: enrollment.teamId,
    teamMarking: mapStaffMarking(enrollment.team.staffTeamMarking),
    studentMarking: mapStaffMarking(studentMarking),
  };
}
