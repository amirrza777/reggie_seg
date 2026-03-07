import { prisma } from "../../../shared/db.js";

async function findStaffScope(staffId: number) {
  const user = await prisma.user.findUnique({
    where: { id: staffId },
    select: { enterpriseId: true, role: true, active: true },
  });
  if (!user || user.active === false || user.role === "STUDENT") {
    return null;
  }
  return user;
}

export async function getModuleDetailsIfAuthorised(moduleId: number, staffId: number) {
  const staffScope = await findStaffScope(staffId);
  if (!staffScope) return null;
  return prisma.module.findFirst({
    where: {
      id: moduleId,
      enterpriseId: staffScope.enterpriseId,
    },
    select: { id: true, name: true },
  });
}

export async function findModulesForStaff(staffId: number) {
  const staffScope = await findStaffScope(staffId);
  if (!staffScope) return [];
  return prisma.module.findMany({
    where: { enterpriseId: staffScope.enterpriseId },
    orderBy: { name: "asc" },
  });
}

export function countStudentsInModule(moduleId: number) {
  return prisma.userModule.count({
    where: { moduleId },
  });
}

export function countSubmittedPAsForModule(moduleId: number) {
  return prisma.peerAssessment.count({
    where: { project: { moduleId } },
  });
}

export function findTeamsInModule(moduleId: number) {
  return prisma.team.findMany({
    where: { project: { moduleId } },
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
    where: { id: teamId, project: { moduleId } },
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
      templateId: true,
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
        select: { id: true, label: true, order: true, type: true, configs: true },
      },
    },
  });
}

export function findTeamMarking(teamId: number) {
  return prisma.staffTeamMarking.findUnique({
    where: { teamId },
    select: {
      mark: true,
      formativeFeedback: true,
      updatedAt: true,
      marker: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

export function findStudentMarking(teamId: number, studentUserId: number) {
  return prisma.staffStudentMarking.findUnique({
    where: {
      teamId_studentUserId: { teamId, studentUserId },
    },
    select: {
      mark: true,
      formativeFeedback: true,
      updatedAt: true,
      marker: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

export async function isStudentInTeam(teamId: number, studentUserId: number) {
  const count = await prisma.teamAllocation.count({
    where: { teamId, userId: studentUserId },
  });
  return count > 0;
}

export function upsertTeamMarking(data: {
  teamId: number;
  markerUserId: number;
  mark: number | null;
  formativeFeedback: string | null;
}) {
  return prisma.staffTeamMarking.upsert({
    where: { teamId: data.teamId },
    create: {
      teamId: data.teamId,
      markerUserId: data.markerUserId,
      mark: data.mark,
      formativeFeedback: data.formativeFeedback,
    },
    update: {
      markerUserId: data.markerUserId,
      mark: data.mark,
      formativeFeedback: data.formativeFeedback,
    },
    select: {
      mark: true,
      formativeFeedback: true,
      updatedAt: true,
      marker: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

export function upsertStudentMarking(data: {
  teamId: number;
  studentUserId: number;
  markerUserId: number;
  mark: number | null;
  formativeFeedback: string | null;
}) {
  return prisma.staffStudentMarking.upsert({
    where: {
      teamId_studentUserId: {
        teamId: data.teamId,
        studentUserId: data.studentUserId,
      },
    },
    create: {
      teamId: data.teamId,
      studentUserId: data.studentUserId,
      markerUserId: data.markerUserId,
      mark: data.mark,
      formativeFeedback: data.formativeFeedback,
    },
    update: {
      markerUserId: data.markerUserId,
      mark: data.mark,
      formativeFeedback: data.formativeFeedback,
    },
    select: {
      mark: true,
      formativeFeedback: true,
      updatedAt: true,
      marker: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}