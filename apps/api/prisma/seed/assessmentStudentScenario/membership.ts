import { prisma } from "../prismaClient";
import type { AssessmentStudentScenarioProject } from "./setup";

export async function syncAssessmentStudentModuleMembership(
  enterpriseId: string,
  modules: Array<{ id: number }>,
  moduleMemberIds: number[],
  markerUserId: number,
) {
  const uniqueMemberIds = Array.from(new Set(moduleMemberIds.filter((userId) => Number.isInteger(userId) && userId > 0)));
  const userModules = uniqueMemberIds.flatMap((userId) =>
    modules.map((module) => ({ enterpriseId, moduleId: module.id, userId })),
  );
  const moduleLeads = modules.map((module) => ({ moduleId: module.id, userId: markerUserId }));
  const [enrollments, leads] = await Promise.all([
    prisma.userModule.createMany({ data: userModules, skipDuplicates: true }),
    prisma.moduleLead.createMany({ data: moduleLeads, skipDuplicates: true }),
  ]);
  return enrollments.count + leads.count;
}

export async function syncAssessmentStudentTeamMembers(
  projects: AssessmentStudentScenarioProject[],
  memberIds: number[],
) {
  let rows = 0;
  for (const project of projects) {
    rows += await syncSingleTeamMembers(project.teamId, memberIds);
  }
  return rows;
}

async function syncSingleTeamMembers(teamId: number, memberIds: number[]) {
  await prisma.teamAllocation.deleteMany({ where: { teamId, userId: { notIn: memberIds } } });
  const existing = await prisma.teamAllocation.findMany({ where: { teamId, userId: { in: memberIds } }, select: { userId: true } });
  const existingIds = new Set(existing.map((row) => row.userId));
  const data = memberIds.filter((userId) => !existingIds.has(userId)).map((userId) => ({ teamId, userId }));
  if (data.length === 0) return 0;
  const created = await prisma.teamAllocation.createMany({ data, skipDuplicates: true });
  return created.count;
}
