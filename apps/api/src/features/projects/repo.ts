import { prisma } from "../../shared/db.js";

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
      module: {
        select: {
          name: true,
        },
      },
    },
  });
}

async function getScopedStaffUser(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, enterpriseId: true },
  });
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
            moduleLeads: {
              some: {
                userId,
              },
            },
          },
        };

  return prisma.project.findMany({
    where,
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      moduleId: true,
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
              moduleLeads: {
                some: {
                  userId,
                },
              },
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

export async function createProject(name: string, moduleId: number, questionnaireTemplateId: number, teamIds: number[]) {
  const project = await prisma.project.create({
    data: {
      name,
      moduleId,
      questionnaireTemplateId,
    },
    select: {
      id: true,
      name: true,
      moduleId: true,
      questionnaireTemplateId: true,
    },
  });

  return project;
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
  });

  if (!userTeam) {
    return null;
  }
  const projectDeadline = userTeam.team.project.deadline;
  const teamOverride = userTeam.team.deadlineOverride;

  return {
    taskOpenDate: teamOverride?.taskOpenDate ?? projectDeadline?.taskOpenDate,
    taskDueDate: teamOverride?.taskDueDate ?? projectDeadline?.taskDueDate,
    assessmentOpenDate: teamOverride?.assessmentOpenDate ?? projectDeadline?.assessmentOpenDate,
    assessmentDueDate: teamOverride?.assessmentDueDate ?? projectDeadline?.assessmentDueDate,
    feedbackOpenDate: teamOverride?.feedbackOpenDate ?? projectDeadline?.feedbackOpenDate,
    feedbackDueDate: teamOverride?.feedbackDueDate ?? projectDeadline?.feedbackDueDate,
    isOverridden: !!teamOverride,
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