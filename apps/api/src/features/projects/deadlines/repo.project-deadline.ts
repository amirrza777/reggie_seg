import type { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/db.js";

const USER_PROJECT_DEADLINE_SELECT = {
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
              teamAllocationQuestionnaireOpenDate: true,
              teamAllocationQuestionnaireDueDate: true,
              studentOverrides: {
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
} as const;

function userProjectDeadlineWhere(userId: number, projectId: number): Prisma.TeamAllocationWhereInput {
  return {
    userId,
    team: {
      projectId,
      archivedAt: null,
      allocationLifecycle: "ACTIVE",
    },
  };
}

async function findUserTeamDeadlineContext(userId: number, projectId: number) {
  return prisma.teamAllocation.findFirst({
    where: userProjectDeadlineWhere(userId, projectId),
    select: {
      ...USER_PROJECT_DEADLINE_SELECT,
      team: {
        ...USER_PROJECT_DEADLINE_SELECT.team,
        select: {
          ...USER_PROJECT_DEADLINE_SELECT.team.select,
          project: {
            ...USER_PROJECT_DEADLINE_SELECT.team.select.project,
            select: {
              ...USER_PROJECT_DEADLINE_SELECT.team.select.project.select,
              deadline: {
                ...USER_PROJECT_DEADLINE_SELECT.team.select.project.select.deadline,
                select: {
                  ...USER_PROJECT_DEADLINE_SELECT.team.select.project.select.deadline.select,
                  studentOverrides: {
                    ...USER_PROJECT_DEADLINE_SELECT.team.select.project.select.deadline.select.studentOverrides,
                    where: { userId },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

type UserTeamDeadlineContext = NonNullable<Awaited<ReturnType<typeof findUserTeamDeadlineContext>>>;

type DueDateResolutionInput = {
  studentDate: Date | null | undefined;
  teamDate: Date | null | undefined;
  standardDate: Date | null | undefined;
  mcfDate: Date | null | undefined;
  useMcf: boolean;
};

function resolveDueDate(input: DueDateResolutionInput): Date | null | undefined {
  if (input.studentDate) {
    return input.studentDate;
  }
  if (input.teamDate) {
    return input.teamDate;
  }
  if (input.useMcf) {
    return input.mcfDate ?? input.standardDate;
  }
  return input.standardDate;
}

function hasAnyStudentOverride(studentOverride: {
  taskOpenDate: Date | null;
  taskDueDate: Date | null;
  assessmentOpenDate: Date | null;
  assessmentDueDate: Date | null;
  feedbackOpenDate: Date | null;
  feedbackDueDate: Date | null;
} | null | undefined): boolean {
  return [
    studentOverride?.taskOpenDate,
    studentOverride?.taskDueDate,
    studentOverride?.assessmentOpenDate,
    studentOverride?.assessmentDueDate,
    studentOverride?.feedbackOpenDate,
    studentOverride?.feedbackDueDate,
  ].some((value) => Boolean(value));
}

function resolveOpenDate(
  studentDate: Date | null | undefined,
  teamDate: Date | null | undefined,
  projectDate: Date | null | undefined,
): Date | null | undefined {
  if (studentDate) {
    return studentDate;
  }
  if (teamDate) {
    return teamDate;
  }
  return projectDate;
}

function resolveOverrideScope(hasStudentOverride: boolean, hasTeamOverride: boolean) {
  if (hasStudentOverride) {
    return "STUDENT" as const;
  }
  if (hasTeamOverride) {
    return "TEAM" as const;
  }
  return "NONE" as const;
}

function resolveTaskDates(
  studentOverride: NonNullable<UserTeamDeadlineContext["team"]["project"]["deadline"]>["studentOverrides"][number] | undefined,
  teamOverride: UserTeamDeadlineContext["team"]["deadlineOverride"],
  projectDeadline: UserTeamDeadlineContext["team"]["project"]["deadline"],
  useMcf: boolean,
) {
  return {
    taskOpenDate: resolveOpenDate(studentOverride?.taskOpenDate, teamOverride?.taskOpenDate, projectDeadline?.taskOpenDate),
    taskDueDate: resolveDueDate({
      studentDate: studentOverride?.taskDueDate,
      teamDate: teamOverride?.taskDueDate,
      standardDate: projectDeadline?.taskDueDate,
      mcfDate: projectDeadline?.taskDueDateMcf,
      useMcf,
    }),
  };
}

function resolveAssessmentDates(
  studentOverride: NonNullable<UserTeamDeadlineContext["team"]["project"]["deadline"]>["studentOverrides"][number] | undefined,
  teamOverride: UserTeamDeadlineContext["team"]["deadlineOverride"],
  projectDeadline: UserTeamDeadlineContext["team"]["project"]["deadline"],
  useMcf: boolean,
) {
  return {
    assessmentOpenDate: resolveOpenDate(
      studentOverride?.assessmentOpenDate,
      teamOverride?.assessmentOpenDate,
      projectDeadline?.assessmentOpenDate,
    ),
    assessmentDueDate: resolveDueDate({
      studentDate: studentOverride?.assessmentDueDate,
      teamDate: teamOverride?.assessmentDueDate,
      standardDate: projectDeadline?.assessmentDueDate,
      mcfDate: projectDeadline?.assessmentDueDateMcf,
      useMcf,
    }),
  };
}

function resolveFeedbackDates(
  studentOverride: NonNullable<UserTeamDeadlineContext["team"]["project"]["deadline"]>["studentOverrides"][number] | undefined,
  teamOverride: UserTeamDeadlineContext["team"]["deadlineOverride"],
  projectDeadline: UserTeamDeadlineContext["team"]["project"]["deadline"],
  useMcf: boolean,
) {
  return {
    feedbackOpenDate: resolveOpenDate(
      studentOverride?.feedbackOpenDate,
      teamOverride?.feedbackOpenDate,
      projectDeadline?.feedbackOpenDate,
    ),
    feedbackDueDate: resolveDueDate({
      studentDate: studentOverride?.feedbackDueDate,
      teamDate: teamOverride?.feedbackDueDate,
      standardDate: projectDeadline?.feedbackDueDate,
      mcfDate: projectDeadline?.feedbackDueDateMcf,
      useMcf,
    }),
  };
}

function mapUserProjectDeadline(context: UserTeamDeadlineContext) {
  const projectDeadline = context.team.project.deadline;
  const teamOverride = context.team.deadlineOverride;
  const studentOverride = projectDeadline?.studentOverrides?.[0];
  const useMcf = context.team.deadlineProfile === "MCF";

  const hasStudentOverride = hasAnyStudentOverride(studentOverride);
  const hasTeamOverride = Boolean(teamOverride);
  const taskDates = resolveTaskDates(studentOverride, teamOverride, projectDeadline, useMcf);
  const assessmentDates = resolveAssessmentDates(studentOverride, teamOverride, projectDeadline, useMcf);
  const feedbackDates = resolveFeedbackDates(studentOverride, teamOverride, projectDeadline, useMcf);

  return {
    ...taskDates,
    ...assessmentDates,
    ...feedbackDates,
    teamAllocationQuestionnaireOpenDate: projectDeadline?.teamAllocationQuestionnaireOpenDate ?? null,
    teamAllocationQuestionnaireDueDate: projectDeadline?.teamAllocationQuestionnaireDueDate ?? null,
    isOverridden: hasStudentOverride || hasTeamOverride,
    overrideScope: resolveOverrideScope(hasStudentOverride, hasTeamOverride),
    deadlineProfile: context.team.deadlineProfile,
  };
}

export async function getUserProjectDeadline(userId: number, projectId: number) {
  const context = await findUserTeamDeadlineContext(userId, projectId);
  if (!context) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        deadline: true,
      },
    });

    if (!project?.deadline) {
      return null;
    }

    const d = project.deadline;

    return {
      taskOpenDate: d.taskOpenDate,
      taskDueDate: d.taskDueDate,
      assessmentOpenDate: d.assessmentOpenDate,
      assessmentDueDate: d.assessmentDueDate,
      feedbackOpenDate: d.feedbackOpenDate,
      feedbackDueDate: d.feedbackDueDate,
      teamAllocationQuestionnaireOpenDate: d.teamAllocationQuestionnaireOpenDate ?? null,
      teamAllocationQuestionnaireDueDate: d.teamAllocationQuestionnaireDueDate ?? null,
      isOverridden: false,
      overrideScope: "NONE",
      deadlineProfile: "STANDARD",
    };
  }
  return mapUserProjectDeadline(context);
}
