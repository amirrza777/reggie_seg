import { prisma } from "../../../shared/db.js";

//TODO: surely this is ok nesting right?
//TODO: replace with auth staff id
export function getModuleDetailsIfAuthorised(moduleId: number, staffId: number) {
  return prisma.module.findFirst({
    where: {
      id: moduleId,
      //moduleLeads: { some: { userId: staffId } },
    },
    select: { id: true, name: true },
  });
}

export function findModulesForStaff(staffId: number) {
  return prisma.module.findMany({
    where: {
      // moduleLeads: { some: { userId: staffId } },
    },
  });
}

export function countStudentsInModule(moduleId: number) {
  return prisma.userModule.count({
    where: { moduleId },
  });
}

export function countSubmittedPAsForModule(moduleId: number) {
  return prisma.peerAssessment.count({
    where: { moduleId },
  });
}

export function findTeamsInModule(moduleId: number) {
  return prisma.team.findMany({
    where: { moduleId },
    orderBy: { teamName: "asc" },
  });
}

export function countStudentsInTeam(teamId: number) {
  return prisma.teamAllocation.count({
    where: { teamId },
  });
}

export function countSubmittedPAsForTeam(teamId: number) {
  return prisma.peerAssessment.count({
    where: { teamId },
  });
}

export function findTeamByIdAndModule(teamId: number, moduleId: number) {
  return prisma.team.findFirst({
    where: { id: teamId, moduleId },
    select: { id: true, teamName: true },
  });
}

export function findStudentsInTeam(teamId: number) {
  return prisma.teamAllocation
    .findMany({
      where: { teamId },
      select: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    })
    .then((rows) => rows.map((r) => r.user));
}

export async function getTeamWithAssessments(teamId: number) {
  const [members, assessments] = await Promise.all([
    findStudentsInTeam(teamId),
    prisma.peerAssessment.findMany({
      where: { teamId },
      select: { reviewerUserId: true, revieweeUserId: true },
    }),
  ]);
  return { members, assessments };
}

export function findAssessmentsForRevieweeInTeam(teamId: number, revieweeUserId: number) {
  return prisma.peerAssessment.findMany({
    where: { teamId, revieweeUserId },
    select: {
      id: true,
      reviewerUserId: true,
      answersJson: true,
      questionnaireTemplateId: true,
      reviewer: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

export function findTemplateWithQuestions(templateId: number) {
  return prisma.questionnaireTemplate.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      questions: {
        orderBy: { order: "asc" as const },
        select: { id: true, label: true, order: true },
      },
    },
  });
}
