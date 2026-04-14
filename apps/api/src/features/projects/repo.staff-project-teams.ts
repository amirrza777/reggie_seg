import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";
import { getScopedStaffUser, isAdminScopedRole } from "./repo.staff-scope.js";

const STAFF_PROJECT_TEAMS_SELECT = {
  id: true,
  name: true,
  moduleId: true,
  archivedAt: true,
  informationText: true,
  teamAllocationQuestionnaireTemplateId: true,
  module: {
    select: {
      name: true,
      archivedAt: true,
    },
  },
  teams: {
    where: { archivedAt: null, allocationLifecycle: "ACTIVE" as const },
    orderBy: { id: "asc" as const },
    select: {
      id: true,
      teamName: true,
      projectId: true,
      allocationLifecycle: true,
      createdAt: true,
      inactivityFlag: true,
      deadlineProfile: true,
      trelloBoardId: true,
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
              trelloMemberId: true,
              githubAccount: { select: { id: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ProjectSelect;

function buildStaffProjectTeamsWhere(user: NonNullable<Awaited<ReturnType<typeof getScopedStaffUser>>>, projectId: number) {
  return {
    id: projectId,
    module: {
      enterpriseId: user.enterpriseId,
      ...(isAdminScopedRole(user.role)
        ? {}
        : {
            OR: [
              { moduleLeads: { some: { userId: user.id } } },
              { moduleTeachingAssistants: { some: { userId: user.id } } },
            ],
          }),
    },
  } satisfies Prisma.ProjectWhereInput;
}

export async function getStaffProjectTeams(userId: number, projectId: number) {
  const user = await getScopedStaffUser(userId);
  if (!user) {
    return null;
  }

  const project = await prisma.project.findFirst({
    where: buildStaffProjectTeamsWhere(user, projectId),
    select: STAFF_PROJECT_TEAMS_SELECT,
  });

  return project;
}
