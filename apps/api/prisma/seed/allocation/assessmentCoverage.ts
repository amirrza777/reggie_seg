import { seedAssessmentStudentEmail } from "../data";
import { withSeedLogging } from "../logging";
import { prisma } from "../prismaClient";
import type { SeedModule, SeedProject, SeedTeam } from "../types";

export async function seedAssessmentStudentModuleCoverage(
  enterpriseId: string,
  modules: SeedModule[],
  projects: SeedProject[],
  teams: SeedTeam[],
) {
  return withSeedLogging("seedAssessmentStudentModuleCoverage", async () => {
    if (modules.length === 0 || projects.length === 0 || teams.length === 0) {
      return { value: undefined, rows: 0, details: "skipped (missing modules/projects/teams)" };
    }
    const assessmentStudent = await findAssessmentStudent(enterpriseId);
    if (!assessmentStudent) {
      return { value: undefined, rows: 0, details: "skipped (assessment student account not found)" };
    }
    const targetTeamIds = resolveCoverageTeamTargets(modules, projects, teams);
    if (targetTeamIds.length === 0) {
      return { value: undefined, rows: 0, details: "skipped (no team targets found for module coverage)" };
    }
    return createCoverageAllocations(assessmentStudent.id, targetTeamIds);
  });
}

async function findAssessmentStudent(enterpriseId: string) {
  return prisma.user.findUnique({
    where: { enterpriseId_email: { enterpriseId, email: seedAssessmentStudentEmail } },
    select: { id: true },
  });
}

function resolveCoverageTeamTargets(modules: SeedModule[], projects: SeedProject[], teams: SeedTeam[]) {
  const projectByModuleId = new Map<number, SeedProject>();
  for (const project of [...projects].sort((left, right) => left.id - right.id)) {
    if (!projectByModuleId.has(project.moduleId)) projectByModuleId.set(project.moduleId, project);
  }
  return modules
    .map((module) => projectByModuleId.get(module.id))
    .filter((project): project is SeedProject => Boolean(project))
    .map((project) => teams.find((candidate) => candidate.projectId === project.id)?.id ?? null)
    .filter((teamId): teamId is number => typeof teamId === "number");
}

async function createCoverageAllocations(userId: number, targetTeamIds: number[]) {
  const existing = await prisma.teamAllocation.findMany({
    where: { userId, teamId: { in: targetTeamIds } },
    select: { teamId: true },
  });
  const existingTeamIds = new Set(existing.map((allocation) => allocation.teamId));
  const data = targetTeamIds.filter((teamId) => !existingTeamIds.has(teamId)).map((teamId) => ({ teamId, userId }));
  if (data.length === 0) {
    return { value: undefined, rows: 0, details: `coverage already satisfied for ${targetTeamIds.length} module(s)` };
  }
  const created = await prisma.teamAllocation.createMany({ data, skipDuplicates: true });
  return { value: undefined, rows: created.count, details: `coverage teams=${targetTeamIds.length}` };
}
