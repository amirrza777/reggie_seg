import { Role } from "@prisma/client";
import { moduleData, projectData, questionnaireTemplateData, teamData, userData } from "./data";
import { planSeedModuleJoinCode } from "./joinCodes";
import { withSeedLogging } from "./logging";
import { buildSeedModuleContent } from "./moduleContent";
import { prisma } from "./prismaClient";
import type { SeedModule, SeedProject, SeedTeam, SeedTemplate, SeedUser } from "./types";

export async function seedUsers(enterpriseId: string, seedPasswordHash: string): Promise<SeedUser[]> {
  return withSeedLogging("seedUsers", async () => {
    const seedEmails = getSeedUserEmails();
    const created = await createSeedUsers(enterpriseId, seedPasswordHash);
    const updated = await updateSeedUserPasswordHashes(enterpriseId, seedPasswordHash, seedEmails);
    const allUsers = await findSeedUsers(enterpriseId, seedEmails);

    return {
      value: toSeedUsers(allUsers),
      rows: created.count,
      details: `password hashes updated=${updated.count}`,
    };
  });
}

export async function seedModules(enterpriseId: string): Promise<SeedModule[]> {
  return withSeedLogging("seedModules", async () => {
    const created = await prisma.module.createMany({
      data: planModuleSeedData(enterpriseId),
      skipDuplicates: true,
    });

    const modules = await prisma.module.findMany({
      select: { id: true, name: true },
      where: {
        enterpriseId,
        name: { in: moduleData.map((m) => m.name) },
      },
    });

    return {
      value: modules.map((m: { id: number }) => ({ id: m.id })),
      rows: created.count,
      details: `available modules=${modules.length}`,
    };
  });
}

export async function seedQuestionnaireTemplates(ownerId?: number): Promise<SeedTemplate[]> {
  return withSeedLogging("seedQuestionnaireTemplates", async () => {
    if (!ownerId) {
      return buildTemplateSkipResult();
    }

    const seeded = await seedTemplateSet(ownerId, planQuestionnaireTemplateSeedData());

    return {
      value: seeded.templates,
      rows: seeded.createdCount,
      details: `questions generated=${seeded.questionCount}`,
    };
  });
}

export async function seedProjects(modules: SeedModule[], templates: SeedTemplate[]): Promise<SeedProject[]> {
  return withSeedLogging("seedProjects", async () => {
    const readiness = resolveProjectSeedReadiness(modules, templates);
    if (!readiness.ready) return readiness.result;

    const data = planProjectSeedRows(modules, templates, readiness.fallbackModule, readiness.defaultTemplate);

    const created = await prisma.project.createMany({
      data,
      skipDuplicates: true,
    });

    const projects = await prisma.project.findMany({
      select: { id: true, moduleId: true, questionnaireTemplateId: true },
      where: {
        moduleId: { in: modules.map((module) => module.id) },
        name: { in: projectData.map((p) => p.name) },
      },
    });

    return {
      value: projects.map((p: { id: number; moduleId: number; questionnaireTemplateId: number }) => ({
        id: p.id,
        moduleId: p.moduleId,
        templateId: p.questionnaireTemplateId,
      })),
      rows: created.count,
      details: `available projects=${projects.length}`,
    };
  });
}

export async function seedTeams(enterpriseId: string, projects: SeedProject[]): Promise<SeedTeam[]> {
  return withSeedLogging("seedTeams", async () => {
    const readiness = resolveTeamSeedReadiness(projects);
    if (!readiness.ready) return readiness.result;

    const data = planTeamSeedRows(enterpriseId, projects, readiness.fallbackProject);

    const created = await prisma.team.createMany({
      data,
      skipDuplicates: true,
    });

    const teams = await prisma.team.findMany({
      select: { id: true, projectId: true, teamName: true },
      where: {
        enterpriseId,
        teamName: { in: teamData.map((t) => t.teamName) },
      },
    });

    return {
      value: teams.map((t: { id: number; projectId: number }) => ({
        id: t.id,
        projectId: t.projectId,
      })),
      rows: created.count,
      details: `available teams=${teams.length}`,
    };
  });
}

export function planUserSeedData(enterpriseId: string, seedPasswordHash: string) {
  return userData.map((user) => ({ ...user, enterpriseId, passwordHash: seedPasswordHash }));
}

export function planModuleSeedData(enterpriseId: string) {
  return moduleData.map((module, index) => ({
    ...module,
    enterpriseId,
    code: buildSeedModuleCode(index),
    joinCode: planSeedModuleJoinCode(index),
    ...buildSeedModuleContent(module.name, index),
  }));
}

function buildSeedModuleCode(index: number) {
  return `MOD-${index + 1}`;
}

export function planQuestionnaireTemplateSeedData() {
  return questionnaireTemplateData.map((template) => ({
    templateName: template.templateName,
    isPublic: template.isPublic,
    questions: [...template.questions],
  }));
}

export function planTemplateQuestionData(questionLabels: string[]) {
  return questionLabels.map((label, questionIndex) => ({
    label,
    type: "text" as const,
    order: questionIndex + 1,
  }));
}

function buildProjectSeedRow(
  project: (typeof projectData)[number],
  modules: SeedModule[],
  templates: SeedTemplate[],
  fallbackModule: SeedModule,
  defaultTemplate: SeedTemplate
) {
  const module = modules[project.moduleIndex] ?? fallbackModule;
  const template = templates[project.moduleIndex % templates.length] ?? defaultTemplate;
  return {
    name: project.name,
    informationText: project.informationText,
    moduleId: module.id,
    questionnaireTemplateId: template.id,
  };
}

export function planProjectSeedRows(
  modules: SeedModule[],
  templates: SeedTemplate[],
  fallbackModule: SeedModule,
  defaultTemplate: SeedTemplate
) {
  return projectData.map((project) => buildProjectSeedRow(project, modules, templates, fallbackModule, defaultTemplate));
}

function buildTeamSeedRow(
  team: (typeof teamData)[number],
  enterpriseId: string,
  projects: SeedProject[],
  fallbackProject: SeedProject
) {
  const project = projects[team.projectIndex] ?? fallbackProject;
  return {
    teamName: team.teamName,
    projectId: project.id,
    enterpriseId,
  };
}

export function planTeamSeedRows(enterpriseId: string, projects: SeedProject[], fallbackProject: SeedProject) {
  return teamData.map((team) => buildTeamSeedRow(team, enterpriseId, projects, fallbackProject));
}

type SeededTemplateSet = {
  templates: SeedTemplate[];
  createdCount: number;
  questionCount: number;
};

function getSeedUserEmails() {
  return userData.map((user) => user.email);
}

function createSeedUsers(enterpriseId: string, seedPasswordHash: string) {
  return prisma.user.createMany({
    data: planUserSeedData(enterpriseId, seedPasswordHash),
    skipDuplicates: true,
  });
}

function updateSeedUserPasswordHashes(enterpriseId: string, seedPasswordHash: string, emails: string[]) {
  return prisma.user.updateMany({
    where: { enterpriseId, email: { in: emails } },
    data: { passwordHash: seedPasswordHash },
  });
}

function findSeedUsers(enterpriseId: string, emails: string[]) {
  return prisma.user.findMany({
    select: { id: true, role: true, email: true, firstName: true, lastName: true },
    where: { enterpriseId, email: { in: emails } },
  });
}

function toSeedUsers(users: { id: number; role: Role; firstName: string | null; lastName: string | null }[]) {
  return users.map((user) => ({
    id: user.id,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
  }));
}

function buildTemplateSkipResult() {
  return {
    value: [] as SeedTemplate[],
    rows: 0,
    details: "skipped (no template owner found)",
  };
}

async function seedTemplateSet(
  ownerId: number,
  configs: ReturnType<typeof planQuestionnaireTemplateSeedData>
): Promise<SeededTemplateSet> {
  const summary: SeededTemplateSet = { templates: [], createdCount: 0, questionCount: 0 };
  for (const config of configs) {
    const seeded = await seedSingleTemplate(ownerId, config);
    summary.templates.push(seeded.template);
    summary.createdCount += seeded.created ? 1 : 0;
    summary.questionCount += seeded.questionCount;
  }
  return summary;
}

async function seedSingleTemplate(
  ownerId: number,
  config: ReturnType<typeof planQuestionnaireTemplateSeedData>[number]
) {
  const existing = await findExistingTemplate(ownerId, config.templateName);
  const template = await writeTemplate(ownerId, config, existing?.id);
  return {
    created: !existing,
    questionCount: template.questions.length,
    template: { id: template.id, questionLabels: template.questions.map((question) => question.label) },
  };
}

function findExistingTemplate(ownerId: number, templateName: string) {
  return prisma.questionnaireTemplate.findFirst({
    where: { ownerId, templateName },
    select: { id: true },
  });
}

function writeTemplate(
  ownerId: number,
  config: ReturnType<typeof planQuestionnaireTemplateSeedData>[number],
  existingTemplateId?: number
) {
  const include = { questions: { orderBy: { order: "asc" } } } as const;
  const templateData = planTemplateQuestionData(config.questions);
  if (existingTemplateId) {
    return prisma.questionnaireTemplate.update({
      where: { id: existingTemplateId },
      data: {
        templateName: config.templateName,
        isPublic: config.isPublic,
        ownerId,
        questions: { deleteMany: {}, create: templateData },
      },
      include,
    });
  }

  return prisma.questionnaireTemplate.create({
    data: {
      templateName: config.templateName,
      isPublic: config.isPublic,
      ownerId,
      questions: { create: templateData },
    },
    include,
  });
}

function resolveProjectSeedReadiness(modules: SeedModule[], templates: SeedTemplate[]) {
  if (modules.length === 0 || templates.length === 0) {
    return {
      ready: false as const,
      result: { value: [] as SeedProject[], rows: 0, details: "skipped (missing modules/templates)" },
    };
  }
  const fallbackModule = modules[0];
  const defaultTemplate = templates[0];
  if (!fallbackModule || !defaultTemplate) {
    return {
      ready: false as const,
      result: { value: [] as SeedProject[], rows: 0, details: "skipped (no fallback module/template)" },
    };
  }
  return { ready: true as const, fallbackModule, defaultTemplate };
}

function resolveTeamSeedReadiness(projects: SeedProject[]) {
  if (projects.length === 0) {
    return { ready: false as const, result: { value: [] as SeedTeam[], rows: 0, details: "skipped (no projects)" } };
  }
  const fallbackProject = projects[0];
  if (!fallbackProject) {
    return {
      ready: false as const,
      result: { value: [] as SeedTeam[], rows: 0, details: "skipped (no fallback project)" },
    };
  }
  return { ready: true as const, fallbackProject };
}
