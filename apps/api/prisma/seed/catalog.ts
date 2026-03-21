import { Role } from "@prisma/client";
import { moduleData, projectData, questionnaireTemplateData, teamData, userData } from "./data";
import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedModule, SeedProject, SeedTeam, SeedTemplate, SeedUser } from "./types";

export async function seedUsers(enterpriseId: string, seedPasswordHash: string): Promise<SeedUser[]> {
  return withSeedLogging("seedUsers", async () => {
    const created = await prisma.user.createMany({
      data: buildUserSeedData(enterpriseId, seedPasswordHash),
      skipDuplicates: true,
    });

    const updated = await prisma.user.updateMany({
      where: {
        enterpriseId,
        email: { in: userData.map((u) => u.email) },
      },
      data: { passwordHash: seedPasswordHash },
    });

    const allUsers = await prisma.user.findMany({
      select: { id: true, role: true, email: true },
      where: {
        enterpriseId,
        email: {
          in: userData.map((u) => u.email),
        },
      },
    });

    return {
      value: allUsers.map((u: { id: number; role: Role }) => ({
        id: u.id,
        role: u.role,
      })),
      rows: created.count,
      details: `password hashes updated=${updated.count}`,
    };
  });
}

export async function seedModules(enterpriseId: string): Promise<SeedModule[]> {
  return withSeedLogging("seedModules", async () => {
    const created = await prisma.module.createMany({
      data: buildModuleSeedData(enterpriseId),
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
      return {
        value: [] as SeedTemplate[],
        rows: 0,
        details: "skipped (no template owner found)",
      };
    }

    const templates: SeedTemplate[] = [];
    let questionCount = 0;
    let createdCount = 0;

    for (let index = 0; index < questionnaireTemplateData.length; index += 1) {
      const config = questionnaireTemplateData[index];
      const existingTemplate = await prisma.questionnaireTemplate.findFirst({
        where: {
          ownerId,
          templateName: config.templateName,
        },
        select: { id: true },
      });
      const templateData = buildTemplateQuestionData(config.questions);
      const include = { questions: { orderBy: { order: "asc" } } } as const;

      const template = existingTemplate
        ? await prisma.questionnaireTemplate.update({
            where: { id: existingTemplate.id },
            data: {
              templateName: config.templateName,
              isPublic: config.isPublic,
              ownerId,
              questions: {
                deleteMany: {},
                create: templateData,
              },
            },
            include,
          })
        : await prisma.questionnaireTemplate.create({
            data: {
              templateName: config.templateName,
              isPublic: config.isPublic,
              ownerId,
              questions: {
                create: templateData,
              },
            },
            include,
          });

      if (!existingTemplate) {
        createdCount += 1;
      }

      templates.push({
        id: template.id,
        questionLabels: template.questions.map((question) => question.label),
      });

      questionCount += template.questions.length;
    }

    return {
      value: templates,
      rows: createdCount,
      details: `questions generated=${questionCount}`,
    };
  });
}

export async function seedProjects(modules: SeedModule[], templates: SeedTemplate[]): Promise<SeedProject[]> {
  return withSeedLogging("seedProjects", async () => {
    if (modules.length === 0 || templates.length === 0) {
      return {
        value: [] as SeedProject[],
        rows: 0,
        details: "skipped (missing modules/templates)",
      };
    }
    const fallbackModule = modules[0];
    const defaultTemplate = templates[0];
    if (!fallbackModule || !defaultTemplate) {
      return {
        value: [] as SeedProject[],
        rows: 0,
        details: "skipped (no fallback module/template)",
      };
    }

    const data = projectData.map((project) => {
      return buildProjectSeedRow(project, modules, templates, fallbackModule, defaultTemplate);
    });

    const created = await prisma.project.createMany({
      data,
      skipDuplicates: true,
    });

    const projects = await prisma.project.findMany({
      select: { id: true, questionnaireTemplateId: true },
      where: {
        moduleId: { in: modules.map((module) => module.id) },
        name: { in: projectData.map((p) => p.name) },
      },
    });

    return {
      value: projects.map((p: { id: number; questionnaireTemplateId: number }) => ({
        id: p.id,
        templateId: p.questionnaireTemplateId,
      })),
      rows: created.count,
      details: `available projects=${projects.length}`,
    };
  });
}

export async function seedTeams(enterpriseId: string, projects: SeedProject[]): Promise<SeedTeam[]> {
  return withSeedLogging("seedTeams", async () => {
    if (projects.length === 0) {
      return {
        value: [] as SeedTeam[],
        rows: 0,
        details: "skipped (no projects)",
      };
    }
    const fallbackProject = projects[0];
    if (!fallbackProject) {
      return {
        value: [] as SeedTeam[],
        rows: 0,
        details: "skipped (no fallback project)",
      };
    }

    const data = teamData.map((team) => {
      return buildTeamSeedRow(team, enterpriseId, projects, fallbackProject);
    });

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

function buildUserSeedData(enterpriseId: string, seedPasswordHash: string) {
  return userData.map((user) => ({ ...user, enterpriseId, passwordHash: seedPasswordHash }));
}

function buildModuleSeedData(enterpriseId: string) {
  return moduleData.map((module) => ({ ...module, enterpriseId }));
}

function buildTemplateQuestionData(questionLabels: string[]) {
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
    moduleId: module.id,
    questionnaireTemplateId: template.id,
  };
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
