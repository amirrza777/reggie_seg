import { prisma } from "../../shared/db.js";

type RawStaffMarking = {
  mark: number | null;
  formativeFeedback: string | null;
  updatedAt: Date;
  marker: { id: number; firstName: string; lastName: string };
};

const USER_PROJECT_MARKING_SELECT = {
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
} as const;

function mapStaffMarking(marking: RawStaffMarking | null) {
  if (!marking) {
    return null;
  }

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

async function findUserProjectMarkingEnrollment(userId: number, projectId: number) {
  return prisma.teamAllocation.findFirst({
    where: {
      userId,
      team: { projectId, archivedAt: null, allocationLifecycle: "ACTIVE" },
    },
    select: {
      ...USER_PROJECT_MARKING_SELECT,
      team: {
        ...USER_PROJECT_MARKING_SELECT.team,
        select: {
          ...USER_PROJECT_MARKING_SELECT.team.select,
          staffStudentMarkings: {
            ...USER_PROJECT_MARKING_SELECT.team.select.staffStudentMarkings,
            where: { studentUserId: userId },
          },
        },
      },
    },
  });
}

export async function getUserProjectMarking(userId: number, projectId: number) {
  const enrollment = await findUserProjectMarkingEnrollment(userId, projectId);
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
