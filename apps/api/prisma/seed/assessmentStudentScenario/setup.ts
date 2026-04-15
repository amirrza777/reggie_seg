import { planSeedModuleJoinCode } from "../joinCodes";
import { buildSeedModuleContent } from "../moduleContent";
import { prisma } from "../prismaClient";
import type { SeedEnterprise, SeedTemplate } from "../types";
import { buildAssessmentStudentDeadline } from "./deadlines";
import {
  ASSESSMENT_STUDENT_MODULE_NAMES,
  ASSESSMENT_STUDENT_PROJECTS,
  type AssessmentStudentProjectDefinition,
} from "./constants";

export type AssessmentStudentScenarioProject = {
  id: number;
  moduleId: number;
  templateId: number;
  teamId: number;
  teamName: string;
  state: AssessmentStudentProjectDefinition["state"];
};

export async function ensureAssessmentStudentModules(enterprise: SeedEnterprise) {
  const modules = [];
  for (let index = 0; index < ASSESSMENT_STUDENT_MODULE_NAMES.length; index += 1) {
    modules.push(await upsertAssessmentStudentModule(enterprise.id, index));
  }
  return modules;
}

export async function ensureAssessmentStudentProjects(
  enterpriseId: string,
  modules: Array<{ id: number }>,
  template: SeedTemplate,
) {
  const projects: AssessmentStudentScenarioProject[] = [];
  for (const definition of ASSESSMENT_STUDENT_PROJECTS) {
    const module = modules[definition.moduleIndex];
    if (!module) continue;
    const project = await upsertAssessmentStudentProject(module.id, template.id, definition);
    const team = await upsertAssessmentStudentTeam(enterpriseId, project.id, definition.teamName);
    await upsertAssessmentStudentDeadline(project.id, definition.state);
    projects.push({ ...project, moduleId: module.id, templateId: template.id, teamId: team.id, teamName: definition.teamName, state: definition.state });
  }
  return projects;
}

async function upsertAssessmentStudentModule(enterpriseId: string, index: number) {
  const name = ASSESSMENT_STUDENT_MODULE_NAMES[index]!;
  const code = `ASM-DEMO-${index + 1}`;
  const existing = await prisma.module.findFirst({ where: { enterpriseId, name }, select: { id: true } });
  const data = { name, code, joinCode: planSeedModuleJoinCode(900 + index), ...buildSeedModuleContent(name, index) };
  if (existing) return prisma.module.update({ where: { id: existing.id }, data, select: { id: true } });
  return prisma.module.create({ data: { ...data, enterpriseId }, select: { id: true } });
}

async function upsertAssessmentStudentProject(
  moduleId: number,
  templateId: number,
  definition: AssessmentStudentProjectDefinition,
) {
  const existing = await prisma.project.findFirst({ where: { moduleId, name: definition.name }, select: { id: true } });
  const data = {
    moduleId,
    questionnaireTemplateId: templateId,
    name: definition.name,
    informationText: `Seeded assessment-student scenario for ${definition.state}.`,
  };
  if (existing) return prisma.project.update({ where: { id: existing.id }, data, select: { id: true } });
  return prisma.project.create({ data, select: { id: true } });
}

async function upsertAssessmentStudentTeam(enterpriseId: string, projectId: number, teamName: string) {
  return prisma.team.upsert({
    where: { projectId_teamName: { projectId, teamName } },
    update: { allocationLifecycle: "ACTIVE", archivedAt: null, deadlineProfile: "STANDARD" },
    create: { enterpriseId, projectId, teamName, allocationLifecycle: "ACTIVE", deadlineProfile: "STANDARD" },
    select: { id: true },
  });
}

async function upsertAssessmentStudentDeadline(projectId: number, state: AssessmentStudentProjectDefinition["state"]) {
  const dates = buildAssessmentStudentDeadline(state);
  await prisma.projectDeadline.upsert({
    where: { projectId },
    update: dates,
    create: { projectId, ...dates },
  });
}
