import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";
import { matchesFuzzySearchCandidate, parsePositiveIntegerSearchQuery } from "../../shared/fuzzySearch.js";
import { applyFuzzyFallback } from "../../shared/fuzzyFallback.js";

export * from "./warnings/repo.js";
export * from "./nav-flags/repo.js";
export * from "./team-health-review/repo.js";

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

type ModuleAccessRole = "OWNER" | "TEACHING_ASSISTANT" | "ENROLLED" | "ADMIN_ACCESS";

const STAFF_PROJECT_LIST_SELECT = {
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
    where: { archivedAt: null, allocationLifecycle: "ACTIVE" },
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
} satisfies Prisma.ProjectSelect;

function matchesModuleSearchQuery(module: { id: number; name: string }, query: string): boolean {
  return matchesFuzzySearchCandidate({
    query,
    candidateId: module.id,
    sources: [module.name, `module ${module.id}`],
  });
}

function matchesStaffProjectSearchQuery(
  project: { id: number; name: string; module: { name: string } | null },
  query: string,
): boolean {
  return matchesFuzzySearchCandidate({
    query,
    candidateId: project.id,
    sources: [project.name, project.module?.name ?? "", `project ${project.id}`],
  });
}

function resolveModuleAccessRole(
  userRole: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN",
  flags: { isOwner: boolean; isTeachingAssistant: boolean; isEnrolled: boolean },
): ModuleAccessRole {
  if (userRole === "ADMIN" || userRole === "ENTERPRISE_ADMIN") {
    return "ADMIN_ACCESS";
  }

  if (flags.isOwner) return "OWNER";
  if (flags.isTeachingAssistant) return "TEACHING_ASSISTANT";
  if (flags.isEnrolled) return "ENROLLED";

  return "ENROLLED";
}

/** Returns the user projects. */
export async function getUserProjects(userId: number) {
  return prisma.project.findMany({
    where: {
      teams: {
        some: {
          archivedAt: null,
          allocationLifecycle: "ACTIVE",
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
export async function getModulesForUser(
  userId: number,
  options?: { staffOnly?: boolean; compact?: boolean; query?: string | null },
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, enterpriseId: true },
  });

  if (!user) {
    return [];
  }

  const membershipFilter: Prisma.ModuleWhereInput =
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

  const normalizedQuery = typeof options?.query === "string" ? options.query.trim() : "";
  const hasQuery = normalizedQuery.length > 0;
  const numericQuery = hasQuery ? parsePositiveIntegerSearchQuery(normalizedQuery) : null;
  const searchFilter: Prisma.ModuleWhereInput | null = hasQuery
    ? {
        OR: [
          { name: { contains: normalizedQuery } },
          ...(numericQuery !== null ? [{ id: numericQuery }] : []),
        ],
      }
    : null;

  const scopedMembershipFilter: Prisma.ModuleWhereInput = searchFilter
    ? {
        AND: [membershipFilter, searchFilter],
      }
    : membershipFilter;

  if (options?.compact) {
    let compactModules = await prisma.module.findMany({
      where: scopedMembershipFilter,
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
    compactModules = await applyFuzzyFallback(compactModules, {
      query: normalizedQuery,
      fetchFallbackCandidates: async (limit) =>
        prisma.module.findMany({
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
          take: limit,
        }),
      matches: (module, query) => matchesModuleSearchQuery(module, query),
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

  let modules = await prisma.module.findMany({
    where: scopedMembershipFilter,
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
  modules = await applyFuzzyFallback(modules, {
    query: normalizedQuery,
    fetchFallbackCandidates: async (limit) =>
      prisma.module.findMany({
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
        take: limit,
      }),
    matches: (module, query) => matchesModuleSearchQuery(module, query),
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
export async function getStaffProjects(userId: number, options?: { query?: string | null }) {
  const user = await getScopedStaffUser(userId);
  if (!user) return [];

  const baseWhere: Prisma.ProjectWhereInput = {
    module: {
      enterpriseId: user.enterpriseId,
    },
  };

  const where: Prisma.ProjectWhereInput =
    user.role === "ADMIN" || user.role === "ENTERPRISE_ADMIN"
      ? baseWhere
      : {
          AND: [
            baseWhere,
            {
              OR: [
                { module: { moduleLeads: { some: { userId } } } },
                { module: { moduleTeachingAssistants: { some: { userId } } } },
              ],
            },
          ],
        };

  const normalizedQuery = typeof options?.query === "string" ? options.query.trim() : "";
  const hasQuery = normalizedQuery.length > 0;
  const numericQuery = hasQuery ? parsePositiveIntegerSearchQuery(normalizedQuery) : null;
  const scopedWhere: Prisma.ProjectWhereInput = hasQuery
    ? {
        AND: [
          where,
          {
            OR: [
              { name: { contains: normalizedQuery } },
              { module: { name: { contains: normalizedQuery } } },
              ...(numericQuery !== null ? [{ id: numericQuery }] : []),
            ],
          },
        ],
      }
    : where;

  let projects = await prisma.project.findMany({
    where: scopedWhere,
    orderBy: { id: "asc" },
    select: STAFF_PROJECT_LIST_SELECT,
  });
  projects = await applyFuzzyFallback(projects, {
    query: normalizedQuery,
    fetchFallbackCandidates: async (limit) =>
      prisma.project.findMany({
        where,
        orderBy: { id: "asc" },
        select: STAFF_PROJECT_LIST_SELECT,
        take: limit,
      }),
    matches: (project, query) => matchesStaffProjectSearchQuery(project, query),
  });
  return projects;
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
        where: { archivedAt: null, allocationLifecycle: "ACTIVE" },
        orderBy: { id: "asc" },
        select: {
          id: true,
          teamName: true,
          projectId: true,
          allocationLifecycle: true,
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
      informationText: true,
      archivedAt: true,
      moduleId: true,
      questionnaireTemplateId: true,
      projectNavFlags: true,
    },
  });
}

/** Creates a project. */
export async function createProject(
  actorUserId: number,
  name: string,
  moduleId: number,
  questionnaireTemplateId: number,
  informationText: string | null,
  deadline: ProjectDeadlineInput,
) {
  const actor = await getScopedStaffUser(actorUserId);
  if (!actor) {
    throw { code: "FORBIDDEN", message: "User not found" };
  }

  const moduleRecord = await prisma.module.findFirst({
    where: { id: moduleId, enterpriseId: actor.enterpriseId },
    select: { id: true },
  });
  if (!moduleRecord) {
    throw { code: "MODULE_NOT_FOUND" };
  }

  const roleCanAccessAll = actor.role === "ADMIN" || actor.role === "ENTERPRISE_ADMIN";
  if (!roleCanAccessAll) {
    const staffModule = await prisma.module.findFirst({
      where: {
        id: moduleId,
        enterpriseId: actor.enterpriseId,
        OR: [
          { moduleLeads: { some: { userId: actorUserId } } },
          { moduleTeachingAssistants: { some: { userId: actorUserId } } },
        ],
      },
      select: { id: true },
    });
    if (!staffModule) {
      throw { code: "FORBIDDEN", message: "You do not have access to create projects in this module" };
    }
  }

  const template = await prisma.questionnaireTemplate.findUnique({
    where: { id: questionnaireTemplateId },
    select: { id: true },
  });
  if (!template) {
    throw { code: "TEMPLATE_NOT_FOUND" };
  }

  const project = await prisma.project.create({
    data: {
      name,
      informationText,
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

  return project;
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
      archivedAt: null,
      allocationLifecycle: "ACTIVE",
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
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
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
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
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
  return prisma.team.findFirst({
    where: { id: teamId, archivedAt: null, allocationLifecycle: "ACTIVE" },
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
      archivedAt: null,
      allocationLifecycle: "ACTIVE",
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
      team: { projectId, archivedAt: null, allocationLifecycle: "ACTIVE" },
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

async function getAccessibleProjectDeadlineScope(actorUserId: number, projectId: number) {
  const actor = await getScopedStaffUser(actorUserId);
  if (!actor) {
    throw { code: "FORBIDDEN", message: "User not found" };
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      module: {
        enterpriseId: actor.enterpriseId,
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
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND" };
  }

  const roleCanAccessAll = actor.role === "ADMIN" || actor.role === "ENTERPRISE_ADMIN";
  if (!roleCanAccessAll) {
    const accessibleProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        module: {
          enterpriseId: actor.enterpriseId,
          OR: [
            { moduleLeads: { some: { userId: actorUserId } } },
            { moduleTeachingAssistants: { some: { userId: actorUserId } } },
          ],
        },
      },
      select: { id: true },
    });
    if (!accessibleProject) {
      throw { code: "FORBIDDEN", message: "You do not have staff access to this project" };
    }
  }

  return project;
}

export async function getStaffStudentDeadlineOverrides(actorUserId: number, projectId: number) {
  const project = await getAccessibleProjectDeadlineScope(actorUserId, projectId);
  if (!project.deadline) {
    return [];
  }

  const overrides = await prisma.studentDeadlineOverride.findMany({
    where: {
      projectDeadlineId: project.deadline.id,
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
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });

  return overrides.map((override) => ({
    ...override,
    taskOpenDate: override.taskOpenDate?.toISOString() ?? null,
    taskDueDate: override.taskDueDate?.toISOString() ?? null,
    assessmentOpenDate: override.assessmentOpenDate?.toISOString() ?? null,
    assessmentDueDate: override.assessmentDueDate?.toISOString() ?? null,
    feedbackOpenDate: override.feedbackOpenDate?.toISOString() ?? null,
    feedbackDueDate: override.feedbackDueDate?.toISOString() ?? null,
    updatedAt: override.updatedAt.toISOString(),
  }));
}

async function ensureStudentInProject(projectId: number, studentId: number) {
  const allocation = await prisma.teamAllocation.findFirst({
    where: {
      userId: studentId,
      team: {
        projectId,
      },
    },
    select: { userId: true },
  });

  if (!allocation) {
    throw { code: "STUDENT_NOT_IN_PROJECT" };
  }
}

export async function upsertStaffStudentDeadlineOverride(
  actorUserId: number,
  projectId: number,
  studentId: number,
  payload: StudentDeadlineOverrideInput,
) {
  const project = await getAccessibleProjectDeadlineScope(actorUserId, projectId);
  if (!project.deadline) {
    throw { code: "PROJECT_NOT_FOUND" };
  }

  await ensureStudentInProject(projectId, studentId);

  const override = await prisma.studentDeadlineOverride.upsert({
    where: {
      userId_projectDeadlineId: {
        userId: studentId,
        projectDeadlineId: project.deadline.id,
      },
    },
    update: {
      ...(payload.taskOpenDate !== undefined ? { taskOpenDate: payload.taskOpenDate } : {}),
      ...(payload.taskDueDate !== undefined ? { taskDueDate: payload.taskDueDate } : {}),
      ...(payload.assessmentOpenDate !== undefined ? { assessmentOpenDate: payload.assessmentOpenDate } : {}),
      ...(payload.assessmentDueDate !== undefined ? { assessmentDueDate: payload.assessmentDueDate } : {}),
      ...(payload.feedbackOpenDate !== undefined ? { feedbackOpenDate: payload.feedbackOpenDate } : {}),
      ...(payload.feedbackDueDate !== undefined ? { feedbackDueDate: payload.feedbackDueDate } : {}),
      reason: payload.reason ?? null,
      createdByUserId: actorUserId,
    },
    create: {
      userId: studentId,
      projectDeadlineId: project.deadline.id,
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

  return {
    ...override,
    taskOpenDate: override.taskOpenDate?.toISOString() ?? null,
    taskDueDate: override.taskDueDate?.toISOString() ?? null,
    assessmentOpenDate: override.assessmentOpenDate?.toISOString() ?? null,
    assessmentDueDate: override.assessmentDueDate?.toISOString() ?? null,
    feedbackOpenDate: override.feedbackOpenDate?.toISOString() ?? null,
    feedbackDueDate: override.feedbackDueDate?.toISOString() ?? null,
    updatedAt: override.updatedAt.toISOString(),
  };
}

export async function clearStaffStudentDeadlineOverride(
  actorUserId: number,
  projectId: number,
  studentId: number,
) {
  const project = await getAccessibleProjectDeadlineScope(actorUserId, projectId);
  if (!project.deadline) {
    throw { code: "PROJECT_NOT_FOUND" };
  }

  await prisma.studentDeadlineOverride.deleteMany({
    where: {
      userId: studentId,
      projectDeadlineId: project.deadline.id,
    },
  });

  return { cleared: true };
}
