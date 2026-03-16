import { prisma } from "../../shared/db.js";

/** Returns the user projects. */
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

/** Returns the modules for user. */
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

  if (options?.compact) {
    const compactModules = await prisma.module.findMany({
      where: membershipFilter,
      select: {
        id: true,
        name: true,
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
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    return compactModules.map((module) => {
      const accessRole = resolveModuleAccessRole(user.role, {
        isOwner: module.moduleLeads.length > 0,
        isTeachingAssistant: module.moduleTeachingAssistants.length > 0,
        isEnrolled: module.userModules.length > 0,
      });

      return {
        id: module.id,
        name: module.name,
        accessRole,
      };
    });
  }

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
    const accessRole = resolveModuleAccessRole(user.role, {
      isOwner: module.moduleLeads.length > 0,
      isTeachingAssistant: module.moduleTeachingAssistants.length > 0,
      isEnrolled: module.userModules.length > 0,
    });

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

/** Returns the staff projects. */
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
      createdAt: true,
      _count: {
        select: {
          teams: true,
          githubRepositories: true,
        },
      },
      teams: {
        where: { archivedAt: null },
        select: {
          allocations: {
            select: {
              user: {
                select: {
                  githubAccount: { select: { id: true } },
                },
              },
            },
          },
        },
      },
    },
  });
}

/** Returns the staff project teams. */
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
                  githubAccount: { select: { id: true } },
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

/** Returns the project by ID. */
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

/** Creates a project. */
export async function createProject(name: string, moduleId: number, questionnaireTemplateId: number, teamIds: number[]) {
  const project = await prisma.project.create({
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

/** Returns the teammates in project. */
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

/** Returns the user project deadline. */
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

/** Returns the team by ID. */
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

/** Returns the team by user and project. */
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

/** Returns the questions for project. */
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

/** Returns the user project marking. */
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

const teamHealthMessageSelect = {
  id: true,
  projectId: true,
  teamId: true,
  requesterUserId: true,
  reviewedByUserId: true,
  subject: true,
  details: true,
  responseText: true,
  resolved: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  requester: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  reviewedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

export async function createTeamHealthMessage(
  projectId: number,
  teamId: number,
  requesterUserId: number,
  subject: string,
  details: string
) {
  return prisma.teamHealthMessage.create({
    data: {
      projectId,
      teamId,
      requesterUserId,
      subject,
      details,
    },
    select: teamHealthMessageSelect,
  });
}

export async function getTeamHealthMessagesForUserInProject(projectId: number, requesterUserId: number) {
  return prisma.teamHealthMessage.findMany({
    where: {
      projectId,
      requesterUserId,
    },
    orderBy: { createdAt: "desc" },
    select: teamHealthMessageSelect,
  });
}

export async function getTeamHealthMessagesForTeamInProject(projectId: number, teamId: number) {
  return prisma.teamHealthMessage.findMany({
    where: {
      projectId,
      teamId,
    },
    orderBy: { createdAt: "desc" },
    select: teamHealthMessageSelect,
  });
}

export async function hasAnotherResolvedTeamHealthMessage(projectId: number, teamId: number, requestId: number) {
  const existing = await prisma.teamHealthMessage.findFirst({
    where: {
      projectId,
      teamId,
      resolved: true,
      NOT: { id: requestId },
    },
    select: { id: true },
  });

  return Boolean(existing);
}

export async function canStaffAccessTeamInProject(userId: number, projectId: number, teamId: number) {
  const user = await getScopedStaffUser(userId);
  if (!user) return false;

  const roleCanAccessAll = user.role === "ADMIN" || user.role === "ENTERPRISE_ADMIN";
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      teams: {
        some: { id: teamId },
      },
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
    select: { id: true },
  });

  return Boolean(project);
}

type DeadlineSnapshot = {
  taskOpenDate: Date | null;
  taskDueDate: Date | null;
  assessmentOpenDate: Date | null;
  assessmentDueDate: Date | null;
  feedbackOpenDate: Date | null;
  feedbackDueDate: Date | null;
  isOverridden: boolean;
};

type DeadlineFieldKey =
  | "taskOpenDate"
  | "taskDueDate"
  | "assessmentOpenDate"
  | "assessmentDueDate"
  | "feedbackOpenDate"
  | "feedbackDueDate";

export type DeadlineInputMode = "SHIFT_DAYS" | "SELECT_DATE";

type DeadlineOverrideMetadata = {
  inputMode: DeadlineInputMode;
  shiftDays?: Partial<Record<DeadlineFieldKey, number>>;
};

function parseDeadlineOverrideMetadata(reason: string | null | undefined): DeadlineOverrideMetadata | null {
  if (!reason) return null;
  try {
    const parsed = JSON.parse(reason) as {
      inputMode?: unknown;
      shiftDays?: unknown;
    };
    if (parsed.inputMode !== "SHIFT_DAYS" && parsed.inputMode !== "SELECT_DATE") {
      return null;
    }

    const shiftDays: Partial<Record<DeadlineFieldKey, number>> = {};
    if (parsed.shiftDays && typeof parsed.shiftDays === "object" && !Array.isArray(parsed.shiftDays)) {
      const candidate = parsed.shiftDays as Record<string, unknown>;
      const fields: DeadlineFieldKey[] = [
        "taskOpenDate",
        "taskDueDate",
        "assessmentOpenDate",
        "assessmentDueDate",
        "feedbackOpenDate",
        "feedbackDueDate",
      ];

      for (const field of fields) {
        const value = candidate[field];
        if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
          shiftDays[field] = value;
        }
      }
    }

    return {
      inputMode: parsed.inputMode,
      shiftDays: Object.keys(shiftDays).length > 0 ? shiftDays : undefined,
    };
  } catch {
    return null;
  }
}

function serializeDeadlineOverrideMetadata(
  metadata?:
    | {
        inputMode?: DeadlineInputMode;
        shiftDays?: Partial<Record<DeadlineFieldKey, number>>;
      }
    | null
) {
  if (!metadata?.inputMode) return undefined;

  const payload: DeadlineOverrideMetadata = {
    inputMode: metadata.inputMode,
  };

  if (metadata.inputMode === "SHIFT_DAYS" && metadata.shiftDays) {
    const sanitized: Partial<Record<DeadlineFieldKey, number>> = {};
    const fields: DeadlineFieldKey[] = [
      "taskOpenDate",
      "taskDueDate",
      "assessmentOpenDate",
      "assessmentDueDate",
      "feedbackOpenDate",
      "feedbackDueDate",
    ];

    for (const field of fields) {
      const value = metadata.shiftDays[field];
      if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
        sanitized[field] = value;
      }
    }
    if (Object.keys(sanitized).length > 0) {
      payload.shiftDays = sanitized;
    }
  }

  return JSON.stringify(payload);
}

function mergeDeadlinesForTeam(
  projectDeadline: {
    taskOpenDate: Date;
    taskDueDate: Date;
    assessmentOpenDate: Date;
    assessmentDueDate: Date;
    feedbackOpenDate: Date;
    feedbackDueDate: Date;
  } | null,
  teamOverride: {
    taskOpenDate: Date | null;
    taskDueDate: Date | null;
    assessmentOpenDate: Date | null;
    assessmentDueDate: Date | null;
    feedbackOpenDate: Date | null;
    feedbackDueDate: Date | null;
  } | null
): DeadlineSnapshot | null {
  if (!projectDeadline) return null;
  return {
    taskOpenDate: teamOverride?.taskOpenDate ?? projectDeadline.taskOpenDate,
    taskDueDate: teamOverride?.taskDueDate ?? projectDeadline.taskDueDate,
    assessmentOpenDate: teamOverride?.assessmentOpenDate ?? projectDeadline.assessmentOpenDate,
    assessmentDueDate: teamOverride?.assessmentDueDate ?? projectDeadline.assessmentDueDate,
    feedbackOpenDate: teamOverride?.feedbackOpenDate ?? projectDeadline.feedbackOpenDate,
    feedbackDueDate: teamOverride?.feedbackDueDate ?? projectDeadline.feedbackDueDate,
    isOverridden: Boolean(teamOverride),
  };
}

export async function getTeamCurrentDeadlineInProject(projectId: number, teamId: number) {
  const team = await prisma.team.findFirst({
    where: { id: teamId, projectId },
    select: {
      project: {
        select: {
          deadline: {
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
    },
  });
  if (!team) return null;
  return mergeDeadlinesForTeam(team.project.deadline, team.deadlineOverride);
}

export async function getTeamDeadlineDetailsInProject(projectId: number, teamId: number) {
  const team = await prisma.team.findFirst({
    where: { id: teamId, projectId },
    select: {
      project: {
        select: {
          deadline: {
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
      deadlineOverride: {
        select: {
          taskOpenDate: true,
          taskDueDate: true,
          assessmentOpenDate: true,
          assessmentDueDate: true,
          feedbackOpenDate: true,
          feedbackDueDate: true,
          reason: true,
        },
      },
    },
  });
  if (!team?.project.deadline) return null;

  const effectiveDeadline = mergeDeadlinesForTeam(team.project.deadline, team.deadlineOverride);
  if (!effectiveDeadline) return null;

  const metadata = parseDeadlineOverrideMetadata(team.deadlineOverride?.reason);
  return {
    baseDeadline: {
      taskOpenDate: team.project.deadline.taskOpenDate,
      taskDueDate: team.project.deadline.taskDueDate,
      assessmentOpenDate: team.project.deadline.assessmentOpenDate,
      assessmentDueDate: team.project.deadline.assessmentDueDate,
      feedbackOpenDate: team.project.deadline.feedbackOpenDate,
      feedbackDueDate: team.project.deadline.feedbackDueDate,
      isOverridden: false,
    },
    effectiveDeadline,
    deadlineInputMode: metadata?.inputMode ?? null,
    shiftDays: metadata?.shiftDays ?? null,
  };
}

export async function reviewTeamHealthMessage(
  projectId: number,
  teamId: number,
  requestId: number,
  reviewerUserId: number,
  resolved: boolean,
  responseText?: string
) {
  const existing = await prisma.teamHealthMessage.findFirst({
    where: { id: requestId, projectId, teamId },
    select: { id: true, resolved: true },
  });
  if (!existing) return null;

  if (!resolved && existing.resolved) {
    return prisma.$transaction(async (tx) => {
      await tx.teamDeadlineOverride.deleteMany({
        where: { teamId },
      });

      return tx.teamHealthMessage.update({
        where: { id: requestId },
        data: {
          resolved: false,
          reviewedByUserId: reviewerUserId,
          reviewedAt: new Date(),
          responseText: null,
        },
        select: teamHealthMessageSelect,
      });
    });
  }

  return prisma.teamHealthMessage.update({
    where: { id: requestId },
    data: {
      resolved,
      reviewedByUserId: reviewerUserId,
      reviewedAt: new Date(),
      ...(resolved
        ? { ...(responseText !== undefined ? { responseText } : {}) }
        : { responseText: null }),
    },
    select: teamHealthMessageSelect,
  });
}

export async function resolveTeamHealthMessageWithDeadlineOverride(
  projectId: number,
  teamId: number,
  requestId: number,
  reviewerUserId: number,
  overrides: {
    taskOpenDate: Date | null;
    taskDueDate: Date | null;
    assessmentOpenDate: Date | null;
    assessmentDueDate: Date | null;
    feedbackOpenDate: Date | null;
    feedbackDueDate: Date | null;
  },
  metadata?: {
    inputMode?: DeadlineInputMode;
    shiftDays?: Partial<Record<DeadlineFieldKey, number>>;
  }
) {
  return prisma.$transaction(async (tx) => {
    const existingRequest = await tx.teamHealthMessage.findFirst({
      where: { id: requestId, projectId, teamId },
      select: { id: true },
    });
    if (!existingRequest) return null;

    const team = await tx.team.findFirst({
      where: { id: teamId, projectId },
      select: {
        project: {
          select: {
            deadline: {
              select: {
                id: true,
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
    });
    const projectDeadline = team?.project.deadline ?? null;
    if (!projectDeadline) return null;

    const reason = serializeDeadlineOverrideMetadata(metadata);

    const deadlineOverride = await tx.teamDeadlineOverride.upsert({
      where: { teamId },
      update: {
        projectDeadlineId: projectDeadline.id,
        taskOpenDate: overrides.taskOpenDate,
        taskDueDate: overrides.taskDueDate,
        assessmentOpenDate: overrides.assessmentOpenDate,
        assessmentDueDate: overrides.assessmentDueDate,
        feedbackOpenDate: overrides.feedbackOpenDate,
        feedbackDueDate: overrides.feedbackDueDate,
        ...(reason !== undefined ? { reason } : {}),
      },
      create: {
        teamId,
        projectDeadlineId: projectDeadline.id,
        taskOpenDate: overrides.taskOpenDate,
        taskDueDate: overrides.taskDueDate,
        assessmentOpenDate: overrides.assessmentOpenDate,
        assessmentDueDate: overrides.assessmentDueDate,
        feedbackOpenDate: overrides.feedbackOpenDate,
        feedbackDueDate: overrides.feedbackDueDate,
        reason: reason ?? null,
      },
      select: {
        taskOpenDate: true,
        taskDueDate: true,
        assessmentOpenDate: true,
        assessmentDueDate: true,
        feedbackOpenDate: true,
        feedbackDueDate: true,
      },
    });

    const request = await tx.teamHealthMessage.update({
      where: { id: requestId },
      data: {
        resolved: true,
        reviewedByUserId: reviewerUserId,
        reviewedAt: new Date(),
      },
      select: teamHealthMessageSelect,
    });

    const deadline = mergeDeadlinesForTeam(projectDeadline, deadlineOverride);
    if (!deadline) return null;
    return { request, deadline };
  });
}
