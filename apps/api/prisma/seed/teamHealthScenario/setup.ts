import { prisma } from "../prismaClient";
import { resetScenarioDeadlineOverrides } from "../scenarioUtils";
import type { SeedContext } from "../types";
import { seedPartialPeerAssessments } from "./assessments";
import { PROJECT_NAME, SE_MODULE_NAME_FRAGMENT, TEAM_NAME, WARNING_CONFIG } from "./constants";
import { toDateFromNow } from "./time";

export async function resolveScenarioModuleId(context: SeedContext) {
  const preferred = await prisma.module.findFirst({
    where: {
      enterpriseId: context.enterprise.id,
      name: { contains: SE_MODULE_NAME_FRAGMENT },
    },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (preferred) return preferred.id;
  return context.modules[0]?.id ?? null;
}

export async function upsertScenarioProject(context: SeedContext, moduleId: number, templateId: number) {
  const existing = await prisma.project.findFirst({
    where: {
      name: PROJECT_NAME,
      module: { enterpriseId: context.enterprise.id },
    },
    select: { id: true },
  });
  const payload = {
    moduleId,
    questionnaireTemplateId: templateId,
    informationText:
      "Temporary UI testing scenario for team health and warnings. This project is intentionally in a late delivery phase " +
      "with feedback currently open so staff can validate warning banners, escalation cards, and team support workflows.",
    warningsConfig: WARNING_CONFIG as unknown as object,
  };
  if (existing) {
    return prisma.project.update({
      where: { id: existing.id },
      data: payload,
      select: { id: true },
    });
  }

  return prisma.project.create({
    data: {
      name: PROJECT_NAME,
      ...payload,
    },
    select: { id: true },
  });
}

export async function upsertScenarioTeam(context: SeedContext, projectId: number) {
  const existing = await prisma.team.findUnique({
    where: {
      enterpriseId_teamName: {
        enterpriseId: context.enterprise.id,
        teamName: TEAM_NAME,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.team.update({
      where: { id: existing.id },
      data: {
        projectId,
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
        deadlineProfile: "STANDARD",
      },
      select: { id: true },
    });
  }

  return prisma.team.create({
    data: {
      enterpriseId: context.enterprise.id,
      projectId,
      teamName: TEAM_NAME,
      allocationLifecycle: "ACTIVE",
      deadlineProfile: "STANDARD",
    },
    select: { id: true },
  });
}

export async function ensureTeamAllocations(teamId: number, memberIds: number[]) {
  await prisma.teamAllocation.deleteMany({
    where: {
      teamId,
      userId: { notIn: memberIds },
    },
  });

  await prisma.teamAllocation.createMany({
    data: memberIds.map((userId) => ({ teamId, userId })),
    skipDuplicates: true,
  });
}

export async function upsertScenarioDeadline(projectId: number) {
  const taskDueDate = toDateFromNow(-16);
  const assessmentDueDate = toDateFromNow(-3);
  const feedbackDueDate = toDateFromNow(4);

  await prisma.projectDeadline.upsert({
    where: { projectId },
    update: {
      taskOpenDate: toDateFromNow(-24),
      taskDueDate,
      taskDueDateMcf: taskDueDate,
      assessmentOpenDate: toDateFromNow(-14),
      assessmentDueDate,
      assessmentDueDateMcf: assessmentDueDate,
      feedbackOpenDate: toDateFromNow(-1),
      feedbackDueDate,
      feedbackDueDateMcf: feedbackDueDate,
    },
    create: {
      projectId,
      taskOpenDate: toDateFromNow(-24),
      taskDueDate,
      taskDueDateMcf: taskDueDate,
      assessmentOpenDate: toDateFromNow(-14),
      assessmentDueDate,
      assessmentDueDateMcf: assessmentDueDate,
      feedbackOpenDate: toDateFromNow(-1),
      feedbackDueDate,
      feedbackDueDateMcf: feedbackDueDate,
    },
  });
}

export async function preparePrimaryScenarioTeam(context: SeedContext, moduleId: number, templateId: number, memberIds: number[]) {
  const project = await upsertScenarioProject(context, moduleId, templateId);
  const team = await upsertScenarioTeam(context, project.id);
  await ensureTeamAllocations(team.id, memberIds);
  await upsertScenarioDeadline(project.id);
  await resetScenarioDeadlineOverrides(project.id, team.id, memberIds);
  const seededAssessments = await seedPartialPeerAssessments(project.id, team.id, templateId, memberIds);
  return { project, team, seededAssessments };
}
