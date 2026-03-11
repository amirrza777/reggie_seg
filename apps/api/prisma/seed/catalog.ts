import { Role } from "@prisma/client";
import { moduleData, projectData, teamData, userData } from "./data";
import { prisma } from "./prismaClient";
import type { SeedModule, SeedProject, SeedTeam, SeedTemplate, SeedUser } from "./types";

const defaultTemplateQuestions = [
  {
    label: "Technical Skills",
    type: "text",
    order: 1,
    configs: { required: true },
  },
  {
    label: "Communication",
    type: "text",
    order: 2,
    configs: { required: true },
  },
  {
    label: "Teamwork",
    type: "text",
    order: 3,
    configs: { required: true },
  },
  {
    label: "Technical Skills Rating",
    type: "rating",
    order: 4,
    configs: { min: 1, max: 5, required: true },
  },
  {
    label: "Communication Rating",
    type: "multiple-choice",
    order: 5,
    configs: {
      required: true,
      options: ["Excellent", "Good", "Needs Improvement"],
    },
  },
  {
    label: "Teamwork Score",
    type: "slider",
    order: 6,
    configs: {
      min: 0,
      max: 100,
      step: 5,
      left: "Low",
      right: "High",
      required: true,
    },
  },
] as const;

export async function seedUsers(enterpriseId: string, seedPasswordHash: string): Promise<SeedUser[]> {
  await prisma.user.createMany({
    data: userData.map((user) => ({ ...user, enterpriseId, passwordHash: seedPasswordHash })),
    skipDuplicates: true,
  });

  await prisma.user.updateMany({
    where: {
      enterpriseId,
      email: { in: userData.map((u) => u.email) },
      OR: [{ passwordHash: "dev-hash" }],
    },
    data: { passwordHash: seedPasswordHash },
  });

  const allUsers = await prisma.user.findMany({
    select: { id: true, role: true, email: true },
    where: {
      email: {
        in: userData.map((u) => u.email),
      },
    },
  });

  return allUsers.map((u: { id: number; role: Role }) => ({
    id: u.id,
    role: u.role,
  }));
}

export async function seedModules(enterpriseId: string): Promise<SeedModule[]> {
  await prisma.module.createMany({
    data: moduleData.map((module) => ({ ...module, enterpriseId })),
    skipDuplicates: true,
  });

  const modules = await prisma.module.findMany({
    select: { id: true, name: true },
    where: { name: { in: moduleData.map((m) => m.name) } },
  });

  return modules.map((m: { id: number }) => ({ id: m.id }));
}

export async function seedQuestionnaireTemplates(): Promise<SeedTemplate[]> {
  const staffUser = await prisma.user.findFirst({
    where: { role: { in: ["STAFF", "ADMIN"] } },
  });

  if (!staffUser) return [];

  const template = await prisma.questionnaireTemplate.upsert({
    where: { id: 1 },
    update: {
      templateName: "Default Peer Assessment Template",
      isPublic: true,
      questions: {
        deleteMany: {},
        create: [...defaultTemplateQuestions],
      },
    },
    create: {
      templateName: "Default Peer Assessment Template",
      isPublic: true,
      ownerId: staffUser.id,
      questions: {
        create: [...defaultTemplateQuestions],
      },
    },
    include: { questions: true },
  });

  return [{ id: template.id }];
}

export async function seedProjects(modules: SeedModule[], templates: SeedTemplate[]): Promise<SeedProject[]> {
  if (modules.length === 0 || templates.length === 0) return [];
  const fallbackModule = modules[0];
  const defaultTemplate = templates[0];
  if (!fallbackModule || !defaultTemplate) return [];

  const data = projectData.map((project) => {
    const module = modules[project.moduleIndex] ?? fallbackModule;
    return {
      name: project.name,
      moduleId: module.id,
      questionnaireTemplateId: defaultTemplate.id,
    };
  });

  await prisma.project.createMany({
    data,
    skipDuplicates: true,
  });

  const projects = await prisma.project.findMany({
    select: { id: true },
    where: { name: { in: projectData.map((p) => p.name) } },
  });

  return projects.map((p: { id: number }) => ({ id: p.id }));
}

export async function seedTeams(enterpriseId: string, projects: SeedProject[]): Promise<SeedTeam[]> {
  if (projects.length === 0) return [];
  const fallbackProject = projects[0];
  if (!fallbackProject) return [];

  const data = teamData.map((team) => {
    const project = projects[team.projectIndex] ?? fallbackProject;
    return {
      teamName: team.teamName,
      projectId: project.id,
      enterpriseId,
    };
  });

  await prisma.team.createMany({
    data,
    skipDuplicates: true,
  });

  const teams = await prisma.team.findMany({
    select: { id: true, projectId: true, teamName: true },
    where: { teamName: { in: teamData.map((t) => t.teamName) } },
  });

  return teams.map((t: { id: number; projectId: number }) => ({
    id: t.id,
    projectId: t.projectId,
  }));
}
